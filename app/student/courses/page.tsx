
"use client";

import { FormEvent, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
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
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase/client";
import { BookOpen, Plus, GraduationCap, RefreshCw, CheckCircle2 } from "lucide-react";

type Course = {
  id: string;
  title: string;
  description: string;
  code: string;
  teacherId: string;
  isPublished: boolean;
};

export default function StudentCoursesPage() {
  const router = useRouter();
  const [uid, setUid] = useState("");
  const [checking, setChecking] = useState(true);
  const [code, setCode] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

useEffect(() => {
  if (!auth || !db) {
    setError("Firebase is not configured.");
    setChecking(false);
    return;
  }

  const firebaseAuth = auth;
  const firestore = db;

  const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
    if (!user) {
      router.replace("/student-login");
      return;
    }

    try {
      const profile = await getDoc(doc(firestore, "users", user.uid));
      const data = profile.data();

      if (
        !profile.exists() ||
        data?.role !== "student" ||
        data?.approved !== true
      ) {
        setError("Student access not approved.");
        setChecking(false);
        return;
      }

      setUid(user.uid);
     setChecking(false);
      setChecking(false);
    } catch (err) {
      console.error("Student access verification failed:", err);
      setError("Failed to verify student access.");
      setChecking(false);
    }
  });

  return () => unsubscribe();
}, [router]);
  async function loadEnrolledCourses(studentId: string) {
    if (!db) return;
    setLoading(true);
    setError("");

    try {
      const enrollmentQuery = query(
        collection(db, "enrollments"),
        where("studentId", "==", studentId)
      );
      const enrollmentSnapshot = await getDocs(enrollmentQuery);

      const courseResults = await Promise.all(
        enrollmentSnapshot.docs.map(async (enrollment) => {
          const courseId = enrollment.data().courseId as string;
          const courseSnapshot = await getDoc(doc(db!, "courses", courseId));

          if (!courseSnapshot.exists()) return null;

          return {
            id: courseSnapshot.id,
            ...courseSnapshot.data(),
          } as Course;
        })
      );

      setCourses(courseResults.filter((course): course is Course => course !== null));
    } catch (err) {
      console.error("Loading enrolled courses failed:", err);
      setError("Couldn't load enrolled courses. Check Firestore rules.");
    } finally {
      setLoading(false);
    }
  }

  async function joinCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || !uid) return;

    setError("");
    setNotice("");
    setJoining(true);

    try {
      const normalizedCode = code.trim().toUpperCase();

      const matchingCourses = await getDocs(
        query(
          collection(db, "courses"),
          where("code", "==", normalizedCode),
          where("isPublished", "==", true)
        )
      );

      if (matchingCourses.empty) {
        setError("No published course found with that code. Check it and try again.");
        return;
      }

      if (matchingCourses.size > 1) {
        setError("This code matches multiple courses. Ask your teacher for a new code.");
        return;
      }

      const courseSnapshot = matchingCourses.docs[0];
      const courseId = courseSnapshot.id;
      const enrollmentId = `${uid}_${courseId}`;
      const enrollmentRef = doc(db, "enrollments", enrollmentId);
      const existing = await getDoc(enrollmentRef);

      if (existing.exists()) {
        setNotice("You're already enrolled in this course.");
        setCode("");
        return;
      }

      await setDoc(enrollmentRef, {
        studentId: uid,
        courseId,
        enrolledAt: serverTimestamp(),
      });

      setCode("");
      setNotice(`Successfully enrolled in ${courseSnapshot.data().title}.`);
      await loadEnrolledCourses(uid);
    } catch (err) {
      console.error("Course enrollment failed:", err);
      setError("Couldn't enroll. Check your connection and Firestore rules.");
    } finally {
      setJoining(false);
    }
  }

  if (checking) return <Message text="Verifying student access..." />;
  if (!uid) return <Message text={error || "Student access required."} />;

  return (
    <main style={s.page}>
      <header style={s.header}>
        <div style={s.brand}><GraduationCap size={24} /> UniLearn</div>
        <button style={s.secondary} onClick={() => router.push("/student")}>
          Back to dashboard
        </button>
      </header>

      <section style={s.container}>
        <div style={s.eyebrow}>STUDENT WORKSPACE</div>
        <h1 style={s.heading}>My courses</h1>
        <p style={s.muted}>Join a class with the enrollment code provided by your teacher.</p>

        <form onSubmit={joinCourse} style={s.joinCard}>
          <div style={s.joinIcon}><Plus size={22} /></div>
          <div style={s.joinContent}>
            <h2 style={s.subheading}>Join a course</h2>
            <p style={s.mutedSmall}>Enter your six-character course code.</p>
            <div style={s.joinRow}>
              <input
                style={s.input}
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))
                }
                placeholder="e.g. AB12CD"
                minLength={6}
                maxLength={6}
                required
                aria-label="Course enrollment code"
              />
              <button style={s.primary} type="submit" disabled={joining}>
                {joining ? "Joining..." : "Join course"}
              </button>
            </div>
          </div>
        </form>

        {error && <div role="alert" style={s.error}>{error}</div>}
        {notice && <div style={s.notice}><CheckCircle2 size={17} /> {notice}</div>}

        <div style={s.listHeading}>
          <h2 style={s.subheading}>Enrolled courses</h2>
          <button style={s.refresh} onClick={() => loadEnrolledCourses(uid)} disabled={loading}>
            <RefreshCw size={15} /> Refresh
          </button>
        </div>

        {loading ? (
          <Message text="Loading your courses..." />
        ) : courses.length === 0 ? (
          <div style={s.empty}>
            <BookOpen size={31} />
            <h3>No courses yet</h3>
            <p>Enter an enrollment code above to join your first course.</p>
          </div>
        ) : (
          <div style={s.grid}>
            {courses.map((course) => (
              <article key={course.id} style={s.courseCard}>
                <div style={s.courseIcon}><BookOpen size={22} /></div>
                <h3 style={s.courseTitle}>{course.title}</h3>
                <p style={s.mutedSmall}>{course.description || "No course description."}</p>
                <div style={s.courseMeta}>Course code: <strong>{course.code}</strong></div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function Message({ text }: { text: string }) {
  return <div style={{ padding: 30, textAlign: "center", color: "#9aa8bd" }}>{text}</div>;
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#090e1b", color: "#edf2ff", fontFamily: "Arial, sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 15, padding: "18px 5%", borderBottom: "1px solid #263247", background: "#0c1221" },
  brand: { display: "flex", alignItems: "center", gap: 10, fontSize: 20, fontWeight: 800 },
  container: { maxWidth: 1050, margin: "0 auto", padding: "38px 22px" },
  eyebrow: { color: "#a69aff", fontSize: 10, fontWeight: 800, letterSpacing: 1.7 },
  heading: { margin: "10px 0", fontSize: 32, letterSpacing: -1 },
  muted: { color: "#98a6bd", fontSize: 13, lineHeight: 1.7 },
  mutedSmall: { color: "#98a6bd", fontSize: 11, lineHeight: 1.7 },
  joinCard: { display: "flex", alignItems: "flex-start", gap: 16, padding: 22, margin: "26px 0", border: "1px solid #2b3850", borderRadius: 15, background: "#111827" },
  joinIcon: { display: "grid", placeItems: "center", width: 43, height: 43, flexShrink: 0, borderRadius: 12, color: "#b9afff", background: "#7864df26" },
  joinContent: { flex: 1, minWidth: 0 },
  subheading: { margin: "0 0 6px", fontSize: 18 },
  joinRow: { display: "flex", gap: 10, marginTop: 14 },
  input: { width: "100%", minWidth: 0, padding: "12px 14px", border: "1px solid #344158", borderRadius: 9, outlineColor: "#897aff", background: "#0b1220", color: "#f1f5ff", fontSize: 14, letterSpacing: 1.5 },
  primary: { flexShrink: 0, padding: "12px 16px", border: "1px solid #8272f5", borderRadius: 9, background: "#6755d9", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" },
  secondary: { padding: "10px 12px", border: "1px solid #344158", borderRadius: 9, background: "#172235", color: "#dce5f6", fontSize: 11, cursor: "pointer" },
  listHeading: { display: "flex", alignItems: "center", justifyContent: "space-between", margin: "30px 0 16px" },
  refresh: { display: "inline-flex", alignItems: "center", gap: 6, padding: 8, border: 0, background: "transparent", color: "#b8c3d7", cursor: "pointer", fontSize: 11 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 },
  courseCard: { padding: 20, border: "1px solid #29364b", borderRadius: 14, background: "#111827" },
  courseIcon: { display: "grid", placeItems: "center", width: 43, height: 43, borderRadius: 12, color: "#b9afff", background: "#7864df26" },
  courseTitle: { margin: "15px 0 7px", fontSize: 17 },
  courseMeta: { paddingTop: 13, marginTop: 14, borderTop: "1px solid #29364b", color: "#8d9bb2", fontSize: 11 },
  empty: { display: "flex", flexDirection: "column", alignItems: "center", padding: 45, border: "1px dashed #344158", borderRadius: 14, color: "#a69aff", background: "#101725", textAlign: "center" },
  error: { padding: 13, margin: "14px 0", borderRadius: 9, color: "#ffb3bd", background: "#5b202b", fontSize: 12 },
  notice: { display: "flex", alignItems: "center", gap: 8, padding: 13, margin: "14px 0", borderRadius: 9, color: "#8ce7bf", background: "#14382e", fontSize: 12 },
};
