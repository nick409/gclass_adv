"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  LoaderCircle,
  Search,
  Users,
  UserRound,
  X,
  RefreshCw,
} from "lucide-react";
import { auth, db } from "@/lib/firebase/client";

type Course = {
  id: string;
  title: string;
  code: string;
};

type Student = {
  id: string;
  name: string;
  email: string;
  rollNumber: string;
  courseId: string;
  courseTitle: string;
  courseCode: string;
};

type AttendanceStatus = "present" | "absent" | "late";
type AttendanceRecord = { status: AttendanceStatus; note?: string };
type Tab = "students" | "attendance";

const todayISO = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const palette = {
  page: "#171715",
  panel: "#20201D",
  panelAlt: "#262620",
  border: "#393931",
  text: "#F2F0E9",
  muted: "#A5A599",
  accent: "#B9C69A",
  accentText: "#20231B",
  danger: "#E5A29A",
  success: "#B9D4AD",
  amber: "#E4C28D",
};

export default function TeacherStudentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [tab, setTab] = useState<Tab>("students");
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(todayISO());
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [savingId, setSavingId] = useState("");
  const [savingAll, setSavingAll] = useState(false);

  useEffect(() => {
    if (!auth) {
      setError("Firebase is not configured. Check your environment variables.");
      setCheckingAuth(false);
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.replace("/");
        setCheckingAuth(false);
        setLoading(false);
        return;
      }
      if (!db) {
        setError("Firebase is not configured. Check your environment variables.");
        setCheckingAuth(false);
        setLoading(false);
        return;
      }
      try {
        const profile = await getDoc(doc(db, "users", currentUser.uid));
        const data = profile.data();
        if (!profile.exists() || data?.role !== "teacher" || data?.approved !== true) {
          router.replace("/");
          return;
        }
        setUser(currentUser);
      } catch (e) {
        console.error(e);
        setError("Unable to verify your teacher account. Please refresh the page.");
      } finally {
        setCheckingAuth(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const loadRoster = useCallback(async () => {
    if (!user || !db) return;
    setLoading(true);
    setError("");
    try {
      const courseSnap = await getDocs(query(collection(db, "courses"), where("teacherId", "==", user.uid)));
      const courseList: Course[] = courseSnap.docs.map((item) => {
        const data = item.data();
        return {
          id: item.id,
          title: typeof data.title === "string" ? data.title : "Untitled course",
          code: typeof data.code === "string" ? data.code : "—",
        };
      });
      setCourses(courseList);

      const targetCourses = selectedCourse === "all" ? courseList : courseList.filter((c) => c.id === selectedCourse);
      const rosterRows: Student[] = [];
      for (const course of targetCourses) {
        const enrollmentSnap = await getDocs(query(collection(db, "enrollments"), where("courseId", "==", course.id)));
        const studentIds = Array.from(new Set(enrollmentSnap.docs.map((enrollment) => {
          const data = enrollment.data();
          return typeof data.studentId === "string" ? data.studentId : "";
        }).filter(Boolean)));
        const profiles = await Promise.all(studentIds.map(async (studentId) => {
          const profileSnap = await getDoc(doc(db, "users", studentId));
          if (!profileSnap.exists()) return null;
          const data = profileSnap.data();
          return {
            id: studentId,
            name: typeof data.displayName === "string" ? data.displayName : typeof data.name === "string" ? data.name : "Student",
            email: typeof data.email === "string" ? data.email : "",
            rollNumber: typeof data.rollNumber === "string" ? data.rollNumber : "",
            courseId: course.id,
            courseTitle: course.title,
            courseCode: course.code,
          } satisfies Student;
        }));
        rosterRows.push(...profiles.filter((p): p is Student => p !== null));
      }
      setStudents(rosterRows.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e) {
      console.error(e);
      setError("Could not load students. Check your Firestore rules and enrollment records.");
    } finally {
      setLoading(false);
    }
  }, [user, selectedCourse]);

  useEffect(() => {
    if (user) void loadRoster();
  }, [user, loadRoster]);

  const visibleStudents = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return students;
    return students.filter((student) =>
      [student.name, student.email, student.rollNumber, student.courseTitle, student.courseCode]
        .some((value) => value.toLowerCase().includes(needle)),
    );
  }, [students, search]);

  const loadAttendance = useCallback(async () => {
    if (!db || !user || students.length === 0) {
      setAttendance({});
      return;
    }
    try {
      const uniqueStudents = Array.from(new Map(students.map((s) => [s.id, s])).values());
      const records = await Promise.all(uniqueStudents.map(async (student) => {
        const id = `${student.courseId}_${attendanceDate}_${student.id}`;
        const snap = await getDoc(doc(db, "attendance", id));
        const data = snap.data();
        if (snap.exists() && ["present", "absent", "late"].includes(data?.status)) {
          return [id, { status: data.status as AttendanceStatus, note: typeof data.note === "string" ? data.note : "" }] as const;
        }
        return [id, null] as const;
      }));
      const next: Record<string, AttendanceRecord> = {};
      for (const [id, record] of records) if (record) next[id] = record;
      setAttendance(next);
    } catch (e) {
      console.error(e);
      setError("Could not load attendance records. Check your Firestore rules.");
    }
  }, [students, attendanceDate, user]);

  useEffect(() => {
    if (tab === "attendance") void loadAttendance();
  }, [tab, loadAttendance]);

  const setStatus = (student: Student, status: AttendanceStatus) => {
    const id = `${student.courseId}_${attendanceDate}_${student.id}`;
    setAttendance((current) => ({ ...current, [id]: { ...current[id], status } }));
    setNotice("");
  };

  const saveOne = async (student: Student) => {
    if (!db || !user) return;
    const id = `${student.courseId}_${attendanceDate}_${student.id}`;
    const record = attendance[id];
    if (!record) {
      setNotice(`Choose an attendance status for ${student.name} first.`);
      return;
    }
    setSavingId(id);
    setNotice("");
    try {
      await setDoc(doc(db, "attendance", id), {
        teacherId: user.uid,
        courseId: student.courseId,
        courseTitle: student.courseTitle,
        studentId: student.id,
        studentName: student.name,
        date: attendanceDate,
        status: record.status,
        note: record.note || "",
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setNotice(`Attendance saved for ${student.name}.`);
    } catch (e) {
      console.error(e);
      setError("Unable to save attendance. Check your Firestore rules.");
    } finally {
      setSavingId("");
    }
  };

  const saveAll = async () => {
    if (!db || !user) return;
    const uniqueStudents = Array.from(new Map(visibleStudents.map((s) => [s.id + "_" + s.courseId, s])).values());
    const pending = uniqueStudents.filter((student) => attendance[`${student.courseId}_${attendanceDate}_${student.id}`]);
    if (pending.length === 0) {
      setNotice("Mark at least one student before saving attendance.");
      return;
    }
    setSavingAll(true);
    setError("");
    setNotice("");
    try {
      await Promise.all(pending.map(async (student) => {
        const id = `${student.courseId}_${attendanceDate}_${student.id}`;
        const record = attendance[id];
        if (!record) return;
        await setDoc(doc(db, "attendance", id), {
          teacherId: user.uid,
          courseId: student.courseId,
          courseTitle: student.courseTitle,
          studentId: student.id,
          studentName: student.name,
          date: attendanceDate,
          status: record.status,
          note: record.note || "",
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }));
      setNotice(`Saved attendance for ${pending.length} student${pending.length === 1 ? "" : "s"} on ${attendanceDate}.`);
    } catch (e) {
      console.error(e);
      setError("Some attendance records could not be saved. Please retry.");
    } finally {
      setSavingAll(false);
    }
  };

  const uniqueStudents = useMemo(() => Array.from(new Map(students.map((s) => [s.id, s])).values()), [students]);
  const counts = useMemo(() => {
    const values = uniqueStudents.map((student) => attendance[`${student.courseId}_${attendanceDate}_${student.id}`]?.status);
    return {
      present: values.filter((value) => value === "present").length,
      absent: values.filter((value) => value === "absent").length,
      late: values.filter((value) => value === "late").length,
      unmarked: values.filter((value) => !value).length,
    };
  }, [uniqueStudents, attendance, attendanceDate]);

  const inputStyle: React.CSSProperties = { background: palette.panelAlt, color: palette.text, border: `1px solid ${palette.border}`, borderRadius: 10, padding: "11px 12px", outline: "none", minWidth: 0 };
  const secondaryButton: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, background: palette.panelAlt, color: palette.text, border: `1px solid ${palette.border}`, borderRadius: 10, padding: "10px 13px", cursor: "pointer", fontWeight: 600 };
  const primaryButton: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, background: palette.accent, color: palette.accentText, border: 0, borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontWeight: 800 };
  const cardStyle: React.CSSProperties = { background: palette.panel, border: `1px solid ${palette.border}`, borderRadius: 16, padding: 18 };

  if (checkingAuth || (loading && !user)) {
    return <main style={{ minHeight: "100vh", background: palette.page, color: palette.text, display: "grid", placeItems: "center", fontFamily: "Arial, sans-serif" }}><div style={{ display: "flex", gap: 10, alignItems: "center" }}><LoaderCircle size={20} /> Verifying teacher account…</div></main>;
  }

  return (
    <main style={{ minHeight: "100vh", background: palette.page, color: palette.text, padding: "clamp(18px, 3vw, 36px)", fontFamily: "Arial, sans-serif" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        <button onClick={() => router.push("/dashboard")} style={{ ...secondaryButton, marginBottom: 20 }}>← Back to dashboard</button>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
          <div>
            <div style={{ color: palette.accent, fontSize: 11, letterSpacing: 2, fontWeight: 800, marginBottom: 8 }}>FACULTY WORKSPACE</div>
            <h1 style={{ margin: 0, fontSize: "clamp(28px, 4vw, 38px)", letterSpacing: -1 }}>Students</h1>
            <p style={{ color: palette.muted, margin: "9px 0 0", lineHeight: 1.6 }}>Manage your class roster and record attendance from one place.</p>
          </div>
          <button onClick={() => void loadRoster()} disabled={loading} style={secondaryButton}>{loading ? <LoaderCircle size={16} /> : <RefreshCw size={16} />} Refresh</button>
        </header>

        {error && <div role="alert" style={{ display: "flex", gap: 9, alignItems: "flex-start", padding: 13, marginBottom: 16, borderRadius: 12, background: "#3a2523", border: "1px solid #70413b", color: "#ffd6d0" }}><AlertCircle size={18} /> <span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss error" style={{ marginLeft: "auto", background: "transparent", border: 0, color: "inherit", cursor: "pointer" }}><X size={16} /></button></div>}
        {notice && <div role="status" style={{ padding: 12, marginBottom: 16, borderRadius: 12, background: "#2b3324", border: "1px solid #48563a", color: "#d8e6c4" }}>{notice}</div>}

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
          <div style={cardStyle}><div style={{ display: "flex", justifyContent: "space-between", color: palette.muted, fontSize: 13 }}><span>Enrolled roster entries</span><Users size={17} /></div><div style={{ fontSize: 30, fontWeight: 800, marginTop: 10 }}>{students.length}</div></div>
          <div style={cardStyle}><div style={{ display: "flex", justifyContent: "space-between", color: palette.muted, fontSize: 13 }}><span>Present</span><Check size={17} color={palette.success} /></div><div style={{ fontSize: 30, fontWeight: 800, marginTop: 10 }}>{counts.present}</div></div>
          <div style={cardStyle}><div style={{ display: "flex", justifyContent: "space-between", color: palette.muted, fontSize: 13 }}><span>Absent</span><X size={17} color={palette.danger} /></div><div style={{ fontSize: 30, fontWeight: 800, marginTop: 10 }}>{counts.absent}</div></div>
          <div style={cardStyle}><div style={{ display: "flex", justifyContent: "space-between", color: palette.muted, fontSize: 13 }}><span>Unmarked</span><Clock3 size={17} color={palette.amber} /></div><div style={{ fontSize: 30, fontWeight: 800, marginTop: 10 }}>{counts.unmarked}</div></div>
        </section>

        <section style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", gap: 6, padding: 12, borderBottom: `1px solid ${palette.border}`, flexWrap: "wrap" }}>
            <button onClick={() => { setTab("students"); setNotice(""); }} style={{ ...(tab === "students" ? primaryButton : secondaryButton), borderRadius: 9 }}><Users size={16} /> Student list</button>
            <button onClick={() => { setTab("attendance"); setNotice(""); }} style={{ ...(tab === "attendance" ? primaryButton : secondaryButton), borderRadius: 9 }}><CalendarDays size={16} /> Attendance</button>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", padding: 16, flexWrap: "wrap" }}>
            <label style={{ display: "flex", gap: 9, alignItems: "center", flex: "1 1 230px" }}><Search size={17} color={palette.muted} /><input aria-label="Search students" placeholder="Search name, email, roll no…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...inputStyle, flex: 1, width: "100%" }} /></label>
            <select aria-label="Filter by course" value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} style={{ ...inputStyle, minWidth: 190 }}><option value="all">All my courses</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.code} · {course.title}</option>)}</select>
            {tab === "attendance" && <label style={{ display: "flex", gap: 8, alignItems: "center", color: palette.muted, fontSize: 13 }}><CalendarDays size={16} /><input type="date" aria-label="Attendance date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} max={todayISO()} style={inputStyle} /></label>}
          </div>

          {loading ? <div style={{ padding: 40, display: "flex", justifyContent: "center", gap: 10, color: palette.muted }}><LoaderCircle size={18} /> Loading roster…</div> : visibleStudents.length === 0 ? <div style={{ padding: 48, textAlign: "center" }}><UserRound size={30} color={palette.muted} /><h3 style={{ marginBottom: 6 }}>No students found</h3><p style={{ color: palette.muted, margin: 0 }}>{search ? "Try a different search term." : "Students will appear here after they enroll in one of your courses."}</p></div> : tab === "students" ? (
            <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}><thead><tr style={{ color: palette.muted, textAlign: "left", fontSize: 11, letterSpacing: 1 }}><th style={{ padding: "12px 18px", borderTop: `1px solid ${palette.border}` }}>STUDENT</th><th style={{ padding: "12px 18px", borderTop: `1px solid ${palette.border}` }}>ROLL NUMBER</th><th style={{ padding: "12px 18px", borderTop: `1px solid ${palette.border}` }}>COURSE</th><th style={{ padding: "12px 18px", borderTop: `1px solid ${palette.border}` }}>EMAIL</th></tr></thead><tbody>{visibleStudents.map((student, index) => <tr key={`${student.id}_${student.courseId}`} style={{ borderTop: `1px solid ${palette.border}`, background: index % 2 ? "rgba(255,255,255,0.012)" : "transparent" }}><td style={{ padding: "14px 18px", fontWeight: 700 }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: "#34372c", color: palette.accent, fontWeight: 800 }}>{student.name.trim().charAt(0).toUpperCase() || "S"}</div>{student.name}</div></td><td style={{ padding: "14px 18px", color: palette.muted }}>{student.rollNumber || "—"}</td><td style={{ padding: "14px 18px" }}><span style={{ color: palette.accent, fontSize: 11, fontWeight: 800 }}>{student.courseCode}</span><div style={{ marginTop: 3 }}>{student.courseTitle}</div></td><td style={{ padding: "14px 18px", color: palette.muted }}>{student.email || "—"}</td></tr>)}</tbody></table></div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <div style={{ padding: "0 16px 14px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ color: palette.success, fontSize: 13 }}>Present: {counts.present}</span><span style={{ color: palette.danger, fontSize: 13 }}>Absent: {counts.absent}</span><span style={{ color: palette.amber, fontSize: 13 }}>Late: {counts.late}</span><span style={{ color: palette.muted, fontSize: 13 }}>Unmarked: {counts.unmarked}</span>
                <button onClick={() => void saveAll()} disabled={savingAll} style={{ ...primaryButton, marginLeft: "auto" }}>{savingAll ? <LoaderCircle size={16} /> : <Check size={16} />} Save marked attendance</button>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}><thead><tr style={{ color: palette.muted, textAlign: "left", fontSize: 11, letterSpacing: 1 }}><th style={{ padding: "12px 18px", borderTop: `1px solid ${palette.border}` }}>STUDENT</th><th style={{ padding: "12px 18px", borderTop: `1px solid ${palette.border}` }}>COURSE</th><th style={{ padding: "12px 18px", borderTop: `1px solid ${palette.border}` }}>STATUS</th><th style={{ padding: "12px 18px", borderTop: `1px solid ${palette.border}` }}>ACTION</th></tr></thead><tbody>{visibleStudents.map((student) => { const id = `${student.courseId}_${attendanceDate}_${student.id}`; const current = attendance[id]?.status; const choices: { value: AttendanceStatus; label: string; color: string }[] = [{ value: "present", label: "Present", color: palette.success }, { value: "absent", label: "Absent", color: palette.danger }, { value: "late", label: "Late", color: palette.amber }]; return <tr key={`${student.id}_${student.courseId}`} style={{ borderTop: `1px solid ${palette.border}` }}><td style={{ padding: "13px 18px" }}><strong>{student.name}</strong><div style={{ color: palette.muted, fontSize: 12, marginTop: 3 }}>{student.email || student.rollNumber || student.id}</div></td><td style={{ padding: "13px 18px", color: palette.muted }}>{student.courseCode}</td><td style={{ padding: "13px 18px" }}><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{choices.map((choice) => <button key={choice.value} onClick={() => setStatus(student, choice.value)} style={{ border: `1px solid ${current === choice.value ? choice.color : palette.border}`, background: current === choice.value ? `${choice.color}22` : palette.panelAlt, color: current === choice.value ? choice.color : palette.muted, borderRadius: 8, padding: "7px 9px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>{choice.label}</button>)}</div></td><td style={{ padding: "13px 18px" }}><button onClick={() => void saveOne(student)} disabled={savingId === id || !current} style={{ ...secondaryButton, padding: "7px 10px", fontSize: 12, opacity: !current ? 0.45 : 1 }}>{savingId === id ? <LoaderCircle size={14} /> : <Check size={14} />} Save</button></td></tr>; })}</tbody></table>
              <p style={{ color: palette.muted, fontSize: 12, padding: "0 18px 16px", marginBottom: 0 }}>Attendance is stored separately for each course, student and date. Select a status before saving.</p>
            </div>
          )}
          <div style={{ borderTop: `1px solid ${palette.border}`, padding: "12px 18px", display: "flex", justifyContent: "space-between", gap: 12, color: palette.muted, fontSize: 12, flexWrap: "wrap" }}><span>Showing {visibleStudents.length} of {students.length} roster entries</span><span>{courses.length} course{courses.length === 1 ? "" : "s"} assigned to you</span></div>
        </section>
      </div>
    </main>
  );
}
