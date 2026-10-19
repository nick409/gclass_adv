
"use client";

import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase/client";
import {
  BookOpen,
  Plus,
  Copy,
  RefreshCw,
  Users,
  GraduationCap,
  LoaderCircle,
  CheckCircle2,
} from "lucide-react";

type Course = {
  id: string;
  title: string;
  description: string;
  code: string;
  isPublished: boolean;
  createdAt?: { toMillis?: () => number } | null;
};

export default function TeacherCoursesPage() {
  const router = useRouter();
  const [uid, setUid] = useState("");
  const [checking, setChecking] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseCode, setCourseCode] = useState("");
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
      router.push("/");
      return;
    }

    try {
      const profile = await getDoc(doc(firestore, "users", user.uid));

      if (!profile.exists()) {
        setError("User profile not found.");
        setChecking(false);
        return;
      }

      const data = profile.data();

      if (data.role !== "teacher" || data.approved !== true) {
        setError("Teacher access not approved.");
        setChecking(false);
        return;
      }

      setUid(user.uid);
      await loadCourses(user.uid);
      setChecking(false);
    } catch (err) {
      console.error("Teacher authentication check failed:", err);
      setError("Failed to verify teacher access.");
      setChecking(false);
    }
  });

  return () => unsubscribe();
}, [router]);
  async function loadCourses(teacherId: string) {
    const firestore = db;
    if (!firestore) return;

    setLoading(true);
    try {
      const q = query(
        collection(firestore, "courses"),
        where("teacherId", "==", teacherId)
      );
      const snapshot = await getDocs(q);
      const rows = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      })) as Course[];

      rows.sort(
        (a, b) =>
          (b.createdAt?.toMillis?.() ?? 0) -
          (a.createdAt?.toMillis?.() ?? 0)
      );
      setCourses(rows);
    } catch (err) {
      console.error("Loading courses failed:", err);
      setError("Couldn't load courses. Check your Firestore rules.");
    } finally {
      setLoading(false);
    }
  }

  function generateCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const generated = Array.from(
      { length: 6 },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join("");
    setCourseCode(generated);
  }

  async function createCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const firestore = db;
    if (!firestore || !uid) return;

    setError("");
    setNotice("");
    setSaving(true);

    try {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const code = courseCode || Array.from(
        { length: 6 },
        () => chars[Math.floor(Math.random() * chars.length)]
      ).join("");

      await addDoc(collection(firestore, "courses"), {
        title: title.trim(),
        description: description.trim(),
        code,
        teacherId: uid,
        isPublished: true,
        createdAt: serverTimestamp(),
      });

      setTitle("");
      setDescription("");
      setCourseCode("");
      setShowForm(false);
      setNotice("Course created and published. Share its code with students.");
      await loadCourses(uid);
    } catch (err) {
      console.error("Creating course failed:", err);
      setError("Couldn't create the course. Check your Firestore rules.");
    } finally {
      setSaving(false);
    }
  }

 
async function togglePublished(course: Course) {
  const firestore = db;
  if (!firestore) return;

  setError("");
  setNotice("");

  try {
    await updateDoc(doc(firestore, "courses", course.id), {
      isPublished: !course.isPublished,
    });

    setNotice(
      course.isPublished
        ? "Course unpublished."
        : "Course published and available for enrollment."
    );

    await loadCourses(uid);
  } catch (err) {
    console.error("Updating course failed:", err);
    setError("Couldn't update course publication status.");
  }
}


  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setNotice(`Enrollment code ${code} copied.`);
    } catch {
      setNotice(`Share this enrollment code: ${code}`);
    }
  }

  if (checking) return <Message text="Verifying teacher access..." />;
  if (!uid) return <Message text={error || "Teacher access required."} />;

  return (
    <main style={s.page}>
      <header style={s.header}>
        <div style={s.brand}><GraduationCap size={25} /> UniLearn</div>
        <button style={s.secondaryButton} onClick={() => router.push("/dashboard")}>
          Back to dashboard
        </button>
      </header>

      <section style={s.container}>
        <div style={s.headingRow}>
          <div>
            <div style={s.eyebrow}>TEACHING WORKSPACE</div>
            <h1 style={s.heading}>My courses</h1>
            <p style={s.muted}>Create courses and share enrollment codes with your students.</p>
          </div>
          <button style={s.primaryButton} onClick={() => setShowForm(!showForm)}>
            <Plus size={17} /> {showForm ? "Cancel" : "Create course"}
          </button>
        </div>

        {error && <div style={s.error}>{error}</div>}
        {notice && <div style={s.notice}><CheckCircle2 size={17} /> {notice}</div>}

        {showForm && (
          <form onSubmit={createCourse} style={s.formCard}>
            <h2 style={s.formHeading}>Create a course</h2>
            <label style={s.label} htmlFor="course-title">Course title</label>
            <input
              id="course-title"
              style={s.input}
              placeholder="e.g. Database Management Systems"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              required
            />
            <label style={s.label} htmlFor="course-description">Description</label>
            <textarea
              id="course-description"
              style={s.textarea}
              placeholder="What will students learn in this course?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              rows={3}
            />
            <label style={s.label} htmlFor="course-code">Enrollment code</label>
            <div style={s.codeRow}>
              <input
                id="course-code"
                style={{ ...s.input, flex: 1, textTransform: "uppercase" }}
                placeholder="Generate a code"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                minLength={6}
                maxLength={6}
                required
              />
              <button type="button" style={s.secondaryButton} onClick={generateCode}>
                <RefreshCw size={15} /> Generate
              </button>
            </div>
            <p style={s.hint}>Students will use this code to enroll. Codes should be shared only with your class.</p>
            <button style={s.primaryButton} type="submit" disabled={saving}>
              {saving ? <LoaderCircle size={17} /> : <Plus size={17} />}
              {saving ? "Creating..." : "Create and publish"}
            </button>
          </form>
        )}

        <div style={s.summary}>
          <BookOpen size={19} />
          <strong>{courses.length}</strong>
          <span>course{courses.length === 1 ? "" : "s"} created</span>
          <button style={s.refreshButton} onClick={() => loadCourses(uid)} disabled={loading}>
            <RefreshCw size={15} /> Refresh
          </button>
        </div>

        {loading ? (
          <Message text="Loading your courses..." />
        ) : courses.length === 0 ? (
          <div style={s.empty}>
            <div style={s.emptyIcon}><BookOpen size={27} /></div>
            <h2>No courses yet</h2>
            <p>Create your first course, then share its enrollment code with students.</p>
            <button style={s.primaryButton} onClick={() => setShowForm(true)}>
              <Plus size={17} /> Create your first course
            </button>
          </div>
        ) : (
          <div style={s.grid}>
            {courses.map((course) => (
              <article key={course.id} style={s.courseCard}>
                <div style={s.courseTop}>
                  <div style={s.courseIcon}><BookOpen size={21} /></div>
                  <span style={{
                    ...s.status,
                    color: course.isPublished ? "#70e0b1" : "#f7c879",
                    background: course.isPublished ? "#173c34" : "#40321e",
                  }}>
                    {course.isPublished ? "Published" : "Unpublished"}
                  </span>
                </div>
                <h2 style={s.courseTitle}>{course.title}</h2>
                <p style={s.description}>{course.description || "No description added."}</p>
                <div style={s.codeBox}>
                  <div>
                    <span style={s.hint}>ENROLLMENT CODE</span>
                    <strong style={s.codeText}>{course.code}</strong>
                  </div>
                  <button style={s.copyButton} onClick={() => copyCode(course.code)} aria-label="Copy enrollment code">
                    <Copy size={16} />
                  </button>
                </div>
                <div style={s.courseFooter}>
                  <span style={s.mutedSmall}><Users size={14} /> Enrollment enabled when published</span>
                  <button style={s.secondaryButton} onClick={() => togglePublished(course)}>
                    {course.isPublished ? "Unpublish" : "Publish"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function Message({ text }: { text: string }) {
  return <div style={{ padding: 35, textAlign: "center", color: "#9aa8bd" }}>{text}</div>;
}

const s: Record<string, CSSProperties> = {
  page: { minHeight: "100vh", background: "#090e1b", color: "#edf2ff", fontFamily: "Arial, sans-serif" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 5%", borderBottom: "1px solid #263247", background: "#0c1221" },
  brand: { display: "flex", alignItems: "center", gap: 10, fontWeight: 800, fontSize: 20, color: "#fff" },
  container: { maxWidth: 1180, margin: "0 auto", padding: "38px 24px" },
  headingRow: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 18, marginBottom: 25 },
  eyebrow: { color: "#a69aff", fontSize: 10, fontWeight: 800, letterSpacing: 1.6 },
  heading: { margin: "10px 0", fontSize: 32, letterSpacing: -1 },
  muted: { color: "#98a6bd", fontSize: 13, lineHeight: 1.7 },
  mutedSmall: { display: "flex", alignItems: "center", gap: 6, color: "#93a1b8", fontSize: 11 },
  primaryButton: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 16px", border: "1px solid #8272f5", borderRadius: 10, background: "#6755d9", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" },
  secondaryButton: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px 12px", border: "1px solid #344158", borderRadius: 9, background: "#172235", color: "#dce5f6", fontWeight: 600, fontSize: 11, cursor: "pointer" },
  formCard: { display: "flex", flexDirection: "column", gap: 10, padding: 24, marginBottom: 25, border: "1px solid #2b3850", borderRadius: 15, background: "#111827" },
  formHeading: { margin: "0 0 7px", fontSize: 19 },
  label: { marginTop: 7, color: "#dce4f5", fontSize: 12, fontWeight: 700 },
  input: { width: "100%", boxSizing: "border-box", padding: "13px 14px", border: "1px solid #344158", borderRadius: 9, outlineColor: "#897aff", background: "#0b1220", color: "#f1f5ff", fontSize: 13 },
  textarea: { width: "100%", boxSizing: "border-box", resize: "vertical", padding: "13px 14px", border: "1px solid #344158", borderRadius: 9, outlineColor: "#897aff", background: "#0b1220", color: "#f1f5ff", font: "13px Arial, sans-serif" },
  codeRow: { display: "flex", gap: 9, alignItems: "center" },
  hint: { display: "block", color: "#8492aa", fontSize: 9, letterSpacing: 1, marginBottom: 7 },
  summary: { display: "flex", alignItems: "center", gap: 10, padding: 16, marginBottom: 18, border: "1px solid #263247", borderRadius: 12, background: "#111827", color: "#a99cff" },
  refreshButton: { display: "inline-flex", alignItems: "center", gap: 6, marginLeft: "auto", border: 0, color: "#b8c3d7", background: "transparent", cursor: "pointer", fontSize: 11 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 17 },
  courseCard: { minWidth: 0, padding: 20, border: "1px solid #29364b", borderRadius: 15, background: "linear-gradient(145deg, #141e30, #101725)" },
  courseTop: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 17 },
  courseIcon: { display: "grid", placeItems: "center", width: 43, height: 43, borderRadius: 12, color: "#b9afff", background: "#7664df26" },
  status: { padding: "6px 8px", borderRadius: 7, fontSize: 10, fontWeight: 700 },
  courseTitle: { margin: "0 0 8px", fontSize: 18, lineHeight: 1.45 },
  description: { minHeight: 38, color: "#96a4bb", fontSize: 12, lineHeight: 1.6 },
  codeBox: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: 13, marginTop: 16, border: "1px dashed #465172", borderRadius: 10, background: "#0b1220" },
  codeText: { display: "block", color: "#d7d0ff", fontSize: 20, letterSpacing: 3 },
  copyButton: { display: "grid", placeItems: "center", width: 36, height: 36, border: "1px solid #3b4760", borderRadius: 9, color: "#c3baff", background: "#1b2540", cursor: "pointer" },
  courseFooter: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginTop: 18, paddingTop: 15, borderTop: "1px solid #29364b" },
  empty: { display: "flex", flexDirection: "column", alignItems: "center", padding: "55px 20px", border: "1px dashed #344158", borderRadius: 15, textAlign: "center", background: "#101725" },
  emptyIcon: { display: "grid", placeItems: "center", width: 56, height: 56, marginBottom: 10, borderRadius: 16, background: "#7864df25", color: "#b9afff" },
  error: { padding: 13, marginBottom: 14, borderRadius: 9, color: "#ffb3bd", background: "#5b202b" },
  notice: { display: "flex", alignItems: "center", gap: 8, padding: 13, marginBottom: 14, borderRadius: 9, color: "#8ce7bf", background: "#14382e" },
};
