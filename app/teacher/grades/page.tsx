"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { ArrowLeft, Award, BarChart3, Download, LoaderCircle, Plus, Search } from "lucide-react";
import { auth, db } from "@/lib/firebase/client";

type Course = { id: string; title: string; code?: string };
type Grade = { id: string; studentId: string; studentName?: string; studentEmail?: string; courseId: string; courseTitle: string; courseCode?: string; teacherId: string; assessmentTitle: string; category: string; score: number; maxScore: number; feedback?: string; published: boolean; updatedAt?: { toMillis?: () => number } | null };
type StudentOption = { id: string; name: string; email: string };
const categories = ["MST", "Unit test", "Online quiz", "Assignment", "Lab"];
const shell: React.CSSProperties = { minHeight: "100vh", background: "#171715", color: "#F2F0E9", padding: "32px clamp(16px, 4vw, 48px)", fontFamily: "Arial, Helvetica, sans-serif" };
const panel: React.CSSProperties = { background: "#24241F", border: "1px solid #383A30", borderRadius: 16, padding: 20 };
const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", background: "#191916", border: "1px solid #45463D", borderRadius: 9, color: "#F2F0E9", padding: "11px 12px", font: "inherit" };
const button: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, border: "1px solid #45463D", borderRadius: 9, padding: "10px 13px", color: "#F2F0E9", background: "#2C2D26", cursor: "pointer", fontWeight: 700 };
const primary: React.CSSProperties = { ...button, background: "#B9C69A", borderColor: "#B9C69A", color: "#171715" };

export default function TeacherGradesPage() {
  const router = useRouter();
  const [uid, setUid] = useState("");
  const [checking, setChecking] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [courseFilter, setCourseFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ courseId: "", studentId: "", assessmentTitle: "", category: "MST", score: "", maxScore: "30", feedback: "" });

  const loadGrades = useCallback(async (teacherId: string) => {
    if (!db) return;
    setLoading(true); setError("");
    try {
      const [courseSnap, gradeSnap] = await Promise.all([
        getDocs(query(collection(db, "courses"), where("teacherId", "==", teacherId))),
        getDocs(query(collection(db, "grades"), where("teacherId", "==", teacherId))),
      ]);
      const courseRows = courseSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Course[];
      const courseMap = new Map(courseRows.map(c => [c.id, c]));
      const gradeRows = gradeSnap.docs.map(d => {
        const data = d.data();
        const c = courseMap.get(String(data.courseId ?? ""));
        return { id: d.id, ...data, courseTitle: String(data.courseTitle ?? c?.title ?? "Course unavailable"), courseCode: String(data.courseCode ?? c?.code ?? "") } as Grade;
      });
      gradeRows.sort((a, b) => (b.updatedAt?.toMillis?.() ?? 0) - (a.updatedAt?.toMillis?.() ?? 0));
      setCourses(courseRows); setGrades(gradeRows);
      setForm(old => ({ ...old, courseId: old.courseId || courseRows[0]?.id || "" }));
    } catch (e) { console.error(e); setError("Couldn't load grades. Check Firestore rules and the grades collection."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!auth || !db) { setError("Firebase is not configured."); setChecking(false); return; }
    const unsubscribe = onAuthStateChanged(auth, async user => {
      if (!user) { router.replace("/"); return; }
      try {
        const profile = await getDoc(doc(db!, "users", user.uid));
        if (!profile.exists() || profile.data().role !== "teacher" || profile.data().approved !== true) { setError("Teacher access is not approved."); setChecking(false); return; }
        setUid(user.uid); await loadGrades(user.uid);
      } catch (e) { console.error(e); setError("Unable to verify teacher access."); }
      finally { setChecking(false); }
    });
    return () => unsubscribe();
  }, [router, loadGrades]);

  async function loadStudents(courseId: string) {
    if (!db || !courseId) { setStudents([]); return; }
    try {
      const enrollmentSnap = await getDocs(query(collection(db, "enrollments"), where("courseId", "==", courseId)));
      const rows = await Promise.all(enrollmentSnap.docs.map(async enrollment => {
        const studentId = String(enrollment.data().studentId ?? "");
        if (!studentId) return null;
        const profile = await getDoc(doc(db!, "users", studentId));
        if (!profile.exists() || profile.data().role !== "student" || profile.data().approved !== true) return null;
        const data = profile.data();
        return { id: studentId, name: String(data.displayName ?? data.name ?? data.fullName ?? data.email ?? studentId), email: String(data.email ?? "") } as StudentOption;
      }));
      setStudents(rows.filter((s): s is StudentOption => s !== null));
    } catch (e) { console.error(e); setError("Couldn't load enrolled students. Check enrollment/user read permissions."); setStudents([]); }
  }

  const visible = useMemo(() => grades.filter(g => {
    const text = `${g.assessmentTitle} ${g.courseTitle} ${g.courseCode ?? ""} ${g.studentName ?? ""} ${g.studentEmail ?? ""} ${g.studentId}`.toLowerCase();
    return (courseFilter === "all" || g.courseId === courseFilter) && (categoryFilter === "all" || g.category === categoryFilter) && (statusFilter === "all" || (statusFilter === "published" ? g.published : !g.published)) && text.includes(search.toLowerCase());
  }), [grades, courseFilter, categoryFilter, statusFilter, search]);
  const average = visible.length ? Math.round(visible.reduce((sum, g) => sum + (g.maxScore > 0 ? g.score / g.maxScore * 100 : 0), 0) / visible.length) : 0;
  const publishedCount = visible.filter(g => g.published).length;

  async function createGrade(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || !uid) return;
    const course = courses.find(c => c.id === form.courseId);
    const student = students.find(s => s.id === form.studentId);
    const score = Number(form.score); const maxScore = Number(form.maxScore);
    if (!course || !student || !form.assessmentTitle.trim() || !Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0 || score < 0 || score > maxScore) {
      setError("Choose a course and enrolled student, enter an assessment title, and make sure marks are within the maximum."); return;
    }
    setSaving(true); setError(""); setNotice("");
    try {
      await addDoc(collection(db, "grades"), {
        teacherId: uid, studentId: student.id, studentName: student.name, studentEmail: student.email,
        courseId: course.id, courseTitle: course.title, courseCode: course.code ?? "",
        assessmentTitle: form.assessmentTitle.trim(), category: form.category, score, maxScore,
        feedback: form.feedback.trim(), published: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      setForm(old => ({ ...old, assessmentTitle: "", score: "", feedback: "" })); setShowForm(false);
      setNotice("Grade saved privately. Publish it when you're ready for the student to see it."); await loadGrades(uid);
    } catch (e) { console.error(e); setError("Couldn't save the grade. Check Firestore rules."); }
    finally { setSaving(false); }
  }

  async function togglePublished(grade: Grade) {
    if (!db || grade.teacherId !== uid) return;
    try {
      await updateDoc(doc(db, "grades", grade.id), { published: !grade.published, updatedAt: serverTimestamp() });
      setNotice(grade.published ? "Grade unpublished." : "Grade published."); await loadGrades(uid);
    } catch (e) { console.error(e); setError("Couldn't change grade publication status."); }
  }

  function exportCsv() {
    const quote = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = [["Student", "Student ID", "Course", "Assessment", "Category", "Score", "Maximum", "Percent", "Published", "Feedback"], ...visible.map(g => [g.studentName || g.studentEmail || g.studentId, g.studentId, g.courseTitle, g.assessmentTitle, g.category, g.score, g.maxScore, g.maxScore ? Math.round(g.score / g.maxScore * 100) : 0, g.published ? "Yes" : "No", g.feedback ?? ""])];
    const blob = new Blob([rows.map(row => row.map(quote).join(",")).join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "unilearn-grades.csv"; link.click(); URL.revokeObjectURL(url);
  }

  if (checking) return <main style={shell}><p>Verifying teacher access…</p></main>;
  if (!uid) return <main style={shell}><section style={panel}><h1>Grades</h1><p>{error || "Teacher access required."}</p><button style={button} onClick={() => router.replace("/dashboard")}><ArrowLeft size={16}/> Dashboard</button></section></main>;

  return <main style={shell}>
    <header style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 24 }}><div><button style={{ ...button, marginBottom: 14 }} onClick={() => router.push("/dashboard")}><ArrowLeft size={15}/> Dashboard</button><div style={{ color: "#B9C69A", letterSpacing: 2, fontSize: 11, fontWeight: 800 }}>ACADEMIC PERFORMANCE</div><h1 style={{ margin: "8px 0", fontSize: "clamp(28px, 4vw, 40px)" }}>Grades <span style={{ color: "#B9C69A" }}>& analytics</span></h1><p style={{ color: "#A5A49B", margin: 0 }}>Manage MSTs, unit tests, online quizzes, assignments and labs.</p></div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button style={button} onClick={exportCsv}><Download size={16}/> Export CSV</button><button style={primary} onClick={() => setShowForm(v => !v)}><Plus size={16}/> Add grade</button></div></header>
    {error && <div role="alert" style={{ ...panel, borderColor: "#8C5B4C", color: "#F0B9A9", marginBottom: 16 }}>{error}<button style={{ ...button, marginLeft: 12 }} onClick={() => setError("")}>Dismiss</button></div>}
    {notice && <div role="status" style={{ ...panel, borderColor: "#697650", color: "#D5E0BC", marginBottom: 16 }}>{notice}<button style={{ ...button, float: "right" }} onClick={() => setNotice("")}>Dismiss</button></div>}
    <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 20 }}>{[{ label: "Grade records", value: grades.length, icon: <Award size={18}/> }, { label: "Filtered average", value: `${average}%`, icon: <BarChart3 size={18}/> }, { label: "Published", value: publishedCount, icon: <Award size={18}/> }, { label: "Awaiting release", value: visible.length - publishedCount, icon: <LoaderCircle size={18}/> }].map(s => <article key={s.label} style={panel}><div style={{ display: "flex", justifyContent: "space-between", color: "#A5A49B", fontSize: 13 }}>{s.label}<span style={{ color: "#B9C69A" }}>{s.icon}</span></div><strong style={{ display: "block", fontSize: 30, marginTop: 8 }}>{s.value}</strong></article>)}</section>
    {showForm && <form onSubmit={createGrade} style={{ ...panel, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 14, marginBottom: 20 }}><h2 style={{ gridColumn: "1 / -1", margin: 0 }}>Add assessment result</h2>
      <label style={{ display: "grid", gap: 7, fontSize: 13 }}>Course<select required style={input} value={form.courseId} onChange={e => { const courseId = e.target.value; setForm(old => ({ ...old, courseId, studentId: "" })); setStudents([]); void loadStudents(courseId); }}><option value="">Choose course</option>{courses.map(c => <option key={c.id} value={c.id}>{c.code ? `${c.code} · ` : ""}{c.title}</option>)}</select></label>
      <label style={{ display: "grid", gap: 7, fontSize: 13 }}>Student<select required style={input} value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })} disabled={!form.courseId}><option value="">Choose enrolled student</option>{students.map(s => <option key={s.id} value={s.id}>{s.name}{s.email ? ` · ${s.email}` : ""}</option>)}</select></label>
      <label style={{ display: "grid", gap: 7, fontSize: 13 }}>Assessment title<input required style={input} value={form.assessmentTitle} onChange={e => setForm({ ...form, assessmentTitle: e.target.value })} placeholder="e.g. MST 1"/></label>
      <label style={{ display: "grid", gap: 7, fontSize: 13 }}>Category<select style={input} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{categories.map(c => <option key={c}>{c}</option>)}</select></label>
      <label style={{ display: "grid", gap: 7, fontSize: 13 }}>Marks obtained<input required type="number" min="0" step="0.5" style={input} value={form.score} onChange={e => setForm({ ...form, score: e.target.value })}/></label>
      <label style={{ display: "grid", gap: 7, fontSize: 13 }}>Maximum marks<input required type="number" min="0.5" step="0.5" style={input} value={form.maxScore} onChange={e => setForm({ ...form, maxScore: e.target.value })}/></label>
      <label style={{ display: "grid", gap: 7, fontSize: 13, gridColumn: "1 / -1" }}>Feedback (optional)<textarea rows={3} style={input} value={form.feedback} onChange={e => setForm({ ...form, feedback: e.target.value })} placeholder="Strengths, areas to improve, next steps…"/></label>
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8 }}><button style={primary} type="submit" disabled={saving}>{saving ? "Saving…" : "Save privately"}</button><button style={button} type="button" onClick={() => setShowForm(false)}>Cancel</button></div>
    </form>}
    <section style={panel}><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10, marginBottom: 16 }}><label style={{ display: "grid", gap: 6, fontSize: 12, color: "#A5A49B" }}>Search<input style={input} value={search} onChange={e => setSearch(e.target.value)} placeholder="Student, course, assessment"/></label><label style={{ display: "grid", gap: 6, fontSize: 12, color: "#A5A49B" }}>Course<select style={input} value={courseFilter} onChange={e => setCourseFilter(e.target.value)}><option value="all">All courses</option>{courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label><label style={{ display: "grid", gap: 6, fontSize: 12, color: "#A5A49B" }}>Assessment type<select style={input} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}><option value="all">All assessments</option>{categories.map(c => <option key={c}>{c}</option>)}</select></label><label style={{ display: "grid", gap: 6, fontSize: 12, color: "#A5A49B" }}>Publication<select style={input} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="all">All grades</option><option value="unpublished">Unpublished</option><option value="published">Published</option></select></label></div>
      {loading ? <p>Loading grades…</p> : visible.length === 0 ? <div style={{ textAlign: "center", padding: 36, color: "#A5A49B" }}><Search size={28}/><p>No grade records match these filters.</p><p style={{ fontSize: 12 }}>Add marks manually or grade submissions in Assignments.</p></div> : <div style={{ display: "grid", gap: 10 }}>{visible.map(g => { const pct = g.maxScore > 0 ? Math.round(g.score / g.maxScore * 100) : 0; return <article key={g.id} style={{ border: "1px solid #3A3B32", borderRadius: 12, padding: 15, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}><div style={{ flex: "1 1 230px" }}><div style={{ color: "#B9C69A", fontSize: 11, letterSpacing: 1, fontWeight: 800 }}>{g.courseCode} · {g.category}</div><h3 style={{ margin: "6px 0" }}>{g.assessmentTitle}</h3><div style={{ color: "#A5A49B", fontSize: 13 }}>{g.studentName || g.studentEmail || g.studentId} · {g.courseTitle}</div>{g.feedback && <p style={{ color: "#C3C2B8", fontSize: 13, marginBottom: 0 }}>{g.feedback}</p>}</div><div style={{ minWidth: 100 }}><strong style={{ fontSize: 20 }}>{g.score} / {g.maxScore}</strong><div style={{ height: 5, background: "#414139", borderRadius: 9, overflow: "hidden", marginTop: 7 }}><div style={{ height: "100%", width: `${Math.max(0, Math.min(100, pct))}%`, background: "#B9C69A" }}/></div><small style={{ color: "#A5A49B" }}>{pct}%</small></div><span style={{ color: g.published ? "#B9C69A" : "#D5AE84", border: "1px solid currentColor", borderRadius: 999, padding: "5px 9px", fontSize: 12 }}>{g.published ? "Published" : "Private"}</span><button style={g.published ? button : primary} onClick={() => togglePublished(g)}>{g.published ? "Unpublish" : "Publish grade"}</button></article>; })}</div>}
    </section>
    <p style={{ color: "#8E8E83", fontSize: 12, marginTop: 18 }}>Only publish verified marks. This page manages records in the shared <code>grades</code> collection; student Grades must query that collection and filter by the signed-in student and published status.</p>
  </main>;
}
