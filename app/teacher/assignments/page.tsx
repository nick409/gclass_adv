"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp,
  setDoc, updateDoc, where,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, ClipboardList, FileText, LoaderCircle, Plus, Search, X } from "lucide-react";
import { auth, db } from "@/lib/firebase/client";

type Course = { id: string; title: string; code?: string; isPublished?: boolean };
type Assignment = {
  id: string; title: string; courseId: string; courseTitle: string; courseCode: string;
  kind: "Assignment" | "Quiz" | "Unit Test" | "Lab"; instructions: string;
  maxMarks: number; dueAt: string; status: "draft" | "published"; teacherId: string;
  createdAt?: { toMillis?: () => number } | null;
};
type Submission = {
  id: string; assignmentId: string; studentId: string; studentName?: string;
  studentEmail?: string; fileName?: string; fileUrl?: string; status?: string;
  submittedAt?: { toDate?: () => Date } | null; marks?: number; feedback?: string;
};

const categories = ["Assignment", "Quiz", "Unit Test", "Lab"] as const;
const shell: React.CSSProperties = { minHeight: "100vh", background: "#171715", color: "#F2F0E9", padding: "32px clamp(16px, 4vw, 48px)", fontFamily: "Arial, Helvetica, sans-serif" };
const panel: React.CSSProperties = { background: "#24241F", border: "1px solid #383A30", borderRadius: 16, padding: 20 };
const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", background: "#191916", border: "1px solid #45463D", borderRadius: 9, color: "#F2F0E9", padding: "11px 12px", font: "inherit" };
const button: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, border: "1px solid #45463D", borderRadius: 9, padding: "10px 13px", color: "#F2F0E9", background: "#2C2D26", cursor: "pointer", fontWeight: 700 };
const primary: React.CSSProperties = { ...button, background: "#B9C69A", borderColor: "#B9C69A", color: "#171715" };

export default function TeacherAssignmentsPage() {
  const router = useRouter();
  const [uid, setUid] = useState("");
  const [checking, setChecking] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [items, setItems] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [queryText, setQueryText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [reviewing, setReviewing] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [marksDraft, setMarksDraft] = useState<Record<string, string>>({});
  const [feedbackDraft, setFeedbackDraft] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ title: "", courseId: "", kind: "Assignment" as Assignment["kind"], instructions: "", maxMarks: "20", dueAt: "", status: "draft" as Assignment["status"] });

  const loadData = useCallback(async (teacherId: string) => {
    if (!db) return;
    const firestore = db;
    setLoading(true);
    setError("");
    try {
      const [courseSnap, assignmentSnap] = await Promise.all([
        getDocs(query(collection(firestore, "courses"), where("teacherId", "==", teacherId))),
        getDocs(query(collection(firestore, "assignments"), where("teacherId", "==", teacherId))),
      ]);
      const courseRows = courseSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Course[];
      const courseMap = new Map(courseRows.map(c => [c.id, c]));
      const assignmentRows = assignmentSnap.docs.map(d => {
        const data = d.data();
        const course = courseMap.get(String(data.courseId ?? ""));
        return {
          id: d.id, ...data,
          courseTitle: String(data.courseTitle ?? course?.title ?? "Course unavailable"),
          courseCode: String(data.courseCode ?? course?.code ?? "—"),
        } as Assignment;
      });
      assignmentRows.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
      setCourses(courseRows);
      setItems(assignmentRows);
      setForm(old => ({ ...old, courseId: old.courseId || courseRows[0]?.id || "" }));
    } catch (e) {
      console.error("Loading teacher assignments failed", e);
      setError("Couldn't load assignments. Check Firestore rules and the assignments collection.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!auth || !db) { setError("Firebase is not configured."); setChecking(false); return; }
    const unsubscribe = onAuthStateChanged(auth, async user => {
      if (!user) { router.replace("/"); return; }
      try {
        const profile = await getDoc(doc(db!, "users", user.uid));
        if (!profile.exists() || profile.data().role !== "teacher" || profile.data().approved !== true) {
          setError("Teacher access is not approved."); setChecking(false); return;
        }
        setUid(user.uid);
        await loadData(user.uid);
      } catch (e) { console.error(e); setError("Unable to verify teacher access."); }
      finally { setChecking(false); }
    });
    return () => unsubscribe();
  }, [router, loadData]);

  const visibleItems = useMemo(() => items.filter(a => {
    const match = `${a.title} ${a.courseTitle} ${a.courseCode} ${a.kind}`.toLowerCase().includes(queryText.toLowerCase());
    return match && (statusFilter === "all" || a.status === statusFilter);
  }), [items, queryText, statusFilter]);

  async function createAssignment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || !uid) return;
    const course = courses.find(c => c.id === form.courseId);
    const maxMarks = Number(form.maxMarks);
    if (!course || !form.title.trim() || !Number.isFinite(maxMarks) || maxMarks <= 0) {
      setError("Choose a course, enter a title, and use a positive maximum mark."); return;
    }
    setSaving(true); setError(""); setNotice("");
    try {
      await addDoc(collection(db, "assignments"), {
        title: form.title.trim(), courseId: course.id, courseTitle: course.title,
        courseCode: course.code ?? "", kind: form.kind, instructions: form.instructions.trim(),
        maxMarks, dueAt: form.dueAt || null, status: form.status, teacherId: uid,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      setForm(old => ({ ...old, title: "", instructions: "", maxMarks: "20", dueAt: "" }));
      setShowForm(false);
      setNotice(form.status === "published" ? "Assignment published. Student portal integration must use the same assignments collection." : "Draft saved.");
      await loadData(uid);
    } catch (e) { console.error(e); setError("Couldn't save the assignment. Check Firestore rules."); }
    finally { setSaving(false); }
  }

  async function changeStatus(item: Assignment) {
    if (!db || item.teacherId !== uid) return;
    try {
      await updateDoc(doc(db, "assignments", item.id), { status: item.status === "published" ? "draft" : "published", updatedAt: serverTimestamp() });
      setNotice(item.status === "published" ? "Assignment moved back to draft." : "Assignment published.");
      await loadData(uid);
    } catch (e) { console.error(e); setError("Couldn't update publication status. Check Firestore rules."); }
  }

  async function openReview(item: Assignment) {
    if (!db) return;
    setReviewing(item); setSubmissions([]); setSubmissionsLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "submissions"), where("assignmentId", "==", item.id)));
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Submission[];
      setSubmissions(rows);
      setMarksDraft(Object.fromEntries(rows.map(s => [s.id, s.marks == null ? "" : String(s.marks)])));
      setFeedbackDraft(Object.fromEntries(rows.map(s => [s.id, s.feedback ?? ""])));
    } catch (e) { console.error(e); setError("Couldn't load submissions. Student submissions may not be connected yet."); }
    finally { setSubmissionsLoading(false); }
  }

  async function saveGrade(submission: Submission) {
    if (!db || !reviewing || reviewing.teacherId !== uid) return;
    const score = Number(marksDraft[submission.id]);
    if (!Number.isFinite(score) || score < 0 || score > reviewing.maxMarks) { setError(`Marks must be between 0 and ${reviewing.maxMarks}.`); return; }
    try {
      await updateDoc(doc(db, "submissions", submission.id), { marks: score, feedback: feedbackDraft[submission.id] ?? "", status: "graded", gradedBy: uid, gradedAt: serverTimestamp(), gradePublished: false });
      const gradeId = `${submission.studentId}_${reviewing.id}`;
      await setDoc(doc(db, "grades", gradeId), {
        studentId: submission.studentId, courseId: reviewing.courseId, courseTitle: reviewing.courseTitle,
        courseCode: reviewing.courseCode, teacherId: uid, sourceAssessmentId: reviewing.id,
        assessmentTitle: reviewing.title, category: reviewing.kind, score, maxScore: reviewing.maxMarks,
        feedback: feedbackDraft[submission.id] ?? "", published: false, updatedAt: serverTimestamp(),
      }, { merge: true });
      setNotice("Grade saved as unpublished. Release it from the Grades page when ready.");
      await openReview(reviewing);
    } catch (e) { console.error(e); setError("Couldn't save grade. Check Firestore rules."); }
  }

  if (checking) return <main style={shell}><p>Verifying teacher access…</p></main>;
  if (!uid) return <main style={shell}><section style={panel}><h1>Teacher Assignments</h1><p>{error || "Teacher access required."}</p><button style={button} onClick={() => router.replace("/dashboard")}><ArrowLeft size={16}/> Dashboard</button></section></main>;

  return <main style={shell}>
    <header style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
      <div><button style={{ ...button, marginBottom: 14 }} onClick={() => router.push("/dashboard")}><ArrowLeft size={15}/> Dashboard</button><div style={{ color: "#B9C69A", letterSpacing: 2, fontSize: 11, fontWeight: 800 }}>TEACHING WORKSPACE</div><h1 style={{ margin: "8px 0", fontSize: "clamp(28px, 4vw, 40px)" }}>Assignments <span style={{ color: "#B9C69A" }}>& submissions</span></h1><p style={{ color: "#A5A49B", margin: 0 }}>Create coursework, review student work and return feedback.</p></div>
      <button style={primary} onClick={() => setShowForm(v => !v)}><Plus size={17}/>{showForm ? "Close form" : "Create assignment"}</button>
    </header>
    {error && <div role="alert" style={{ ...panel, borderColor: "#8C5B4C", color: "#F0B9A9", marginBottom: 16 }}><AlertCircle size={16} style={{ verticalAlign: "middle", marginRight: 8 }}/>{error}<button style={{ ...button, marginLeft: 12 }} onClick={() => setError("")}>Dismiss</button></div>}
    {notice && <div role="status" style={{ ...panel, borderColor: "#697650", color: "#D5E0BC", marginBottom: 16 }}>{notice}<button style={{ ...button, float: "right" }} onClick={() => setNotice("")}>Dismiss</button></div>}
    <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 20 }}>
      {[{ label: "Total", value: items.length }, { label: "Published", value: items.filter(a => a.status === "published").length }, { label: "Drafts", value: items.filter(a => a.status === "draft").length }, { label: "Courses", value: courses.length }].map(s => <article key={s.label} style={panel}><div style={{ color: "#A5A49B", fontSize: 13 }}>{s.label}</div><strong style={{ display: "block", fontSize: 30, marginTop: 8 }}>{s.value}</strong></article>)}
    </section>
    {showForm && <form onSubmit={createAssignment} style={{ ...panel, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14, marginBottom: 20 }}>
      <h2 style={{ gridColumn: "1 / -1", margin: 0 }}>New assignment</h2>
      <label style={{ display: "grid", gap: 7, fontSize: 13 }}>Title<input required style={input} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. SQL Query Practice"/></label>
      <label style={{ display: "grid", gap: 7, fontSize: 13 }}>Course<select required style={input} value={form.courseId} onChange={e => setForm({ ...form, courseId: e.target.value })}><option value="">Choose a course</option>{courses.map(c => <option key={c.id} value={c.id}>{c.code ? `${c.code} · ` : ""}{c.title}</option>)}</select></label>
      <label style={{ display: "grid", gap: 7, fontSize: 13 }}>Assessment type<select style={input} value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value as Assignment["kind"] })}>{categories.map(c => <option key={c}>{c}</option>)}</select></label>
      <label style={{ display: "grid", gap: 7, fontSize: 13 }}>Maximum marks<input required min="1" type="number" style={input} value={form.maxMarks} onChange={e => setForm({ ...form, maxMarks: e.target.value })}/></label>
      <label style={{ display: "grid", gap: 7, fontSize: 13 }}>Deadline<input type="datetime-local" style={input} value={form.dueAt} onChange={e => setForm({ ...form, dueAt: e.target.value })}/></label>
      <label style={{ display: "grid", gap: 7, fontSize: 13 }}>Save as<select style={input} value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Assignment["status"] })}><option value="draft">Draft</option><option value="published">Published</option></select></label>
      <label style={{ display: "grid", gap: 7, fontSize: 13, gridColumn: "1 / -1" }}>Instructions<textarea rows={4} style={{ ...input, resize: "vertical" }} value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })} placeholder="Explain the task, requirements and submission format…"/></label>
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, flexWrap: "wrap" }}><button disabled={saving || courses.length === 0} style={primary} type="submit">{saving ? <LoaderCircle size={16}/> : <Plus size={16}/>} {saving ? "Saving…" : form.status === "published" ? "Publish assignment" : "Save draft"}</button><button type="button" style={button} onClick={() => setShowForm(false)}>Cancel</button>{courses.length === 0 && <span style={{ color: "#D5AE84", alignSelf: "center" }}>Create a course before adding assignments.</span>}</div>
    </form>}
    <section style={panel}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18 }}><label style={{ ...input, display: "flex", alignItems: "center", gap: 8, flex: "1 1 260px" }}><Search size={16} color="#A5A49B"/><input aria-label="Search assignments" value={queryText} onChange={e => setQueryText(e.target.value)} placeholder="Search title, course or type" style={{ border: 0, outline: 0, background: "transparent", color: "inherit", width: "100%" }}/></label><select aria-label="Filter status" style={{ ...input, width: "auto", minWidth: 150 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="all">All statuses</option><option value="published">Published</option><option value="draft">Drafts</option></select><button style={button} onClick={() => uid && loadData(uid)}>{loading ? "Refreshing…" : "Refresh"}</button></div>
      {loading ? <p style={{ color: "#A5A49B" }}>Loading assignments…</p> : visibleItems.length === 0 ? <div style={{ textAlign: "center", padding: 36, color: "#A5A49B" }}><ClipboardList size={30}/><p>No assignments match these filters.</p></div> : <div style={{ display: "grid", gap: 10 }}>{visibleItems.map(a => <article key={a.id} style={{ border: "1px solid #3A3B32", borderRadius: 12, padding: 15, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}><div style={{ width: 42, height: 42, borderRadius: 11, display: "grid", placeItems: "center", background: "#34372B", color: "#B9C69A" }}><FileText size={20}/></div><div style={{ flex: "1 1 230px" }}><div style={{ color: "#B9C69A", fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>{a.courseCode} · {a.kind}</div><h3 style={{ margin: "6px 0" }}>{a.title}</h3><div style={{ color: "#A5A49B", fontSize: 13 }}>{a.courseTitle} · {a.maxMarks} marks{a.dueAt ? ` · Due ${new Date(a.dueAt).toLocaleString()}` : " · No deadline"}</div></div><span style={{ color: a.status === "published" ? "#B9C69A" : "#D5AE84", border: "1px solid currentColor", borderRadius: 999, padding: "5px 9px", fontSize: 12 }}>{a.status}</span><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}><button style={button} onClick={() => openReview(a)}>Review submissions</button><button style={button} onClick={() => changeStatus(a)}>{a.status === "published" ? "Unpublish" : "Publish"}</button></div></article>)}</div>}
    </section>
    {reviewing && <div role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setReviewing(null); }} style={{ position: "fixed", inset: 0, zIndex: 50, background: "#000B", display: "grid", placeItems: "center", padding: 16 }}><section role="dialog" aria-modal="true" aria-labelledby="review-title" style={{ ...panel, width: "min(850px, 100%)", maxHeight: "85vh", overflow: "auto" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}><div><div style={{ color: "#B9C69A", fontSize: 11, letterSpacing: 1.5 }}>SUBMISSION REVIEW</div><h2 id="review-title" style={{ margin: "8px 0" }}>{reviewing.title}</h2><p style={{ color: "#A5A49B", marginTop: 0 }}>Maximum {reviewing.maxMarks} marks · Grades are saved unpublished.</p></div><button style={button} onClick={() => setReviewing(null)} aria-label="Close review"><X size={18}/></button></div>
      {submissionsLoading ? <p>Loading submissions…</p> : submissions.length === 0 ? <p style={{ color: "#A5A49B" }}>No submissions found. The student submission workflow must write documents to the top-level <code>submissions</code> collection with an <code>assignmentId</code>.</p> : <div style={{ display: "grid", gap: 12 }}>{submissions.map(s => <article key={s.id} style={{ border: "1px solid #3A3B32", borderRadius: 12, padding: 14 }}><strong>{s.studentName || s.studentEmail || s.studentId}</strong><p style={{ color: "#A5A49B", fontSize: 13, margin: "5px 0 12px" }}>{s.fileName || (s.submittedAt?.toDate ? `Submitted ${s.submittedAt.toDate().toLocaleString()}` : "Submission received")}</p>{s.fileUrl && <p><a href={s.fileUrl} target="_blank" rel="noreferrer" style={{ color: "#B9C69A" }}>Open submitted file</a></p>}<div style={{ display: "grid", gridTemplateColumns: "minmax(110px, 150px) 1fr", gap: 10 }}><label style={{ display: "grid", gap: 5, fontSize: 12 }}>Marks<input type="number" min="0" max={reviewing.maxMarks} style={input} value={marksDraft[s.id] ?? ""} onChange={e => setMarksDraft(old => ({ ...old, [s.id]: e.target.value }))}/></label><label style={{ display: "grid", gap: 5, fontSize: 12 }}>Feedback<textarea rows={2} style={input} value={feedbackDraft[s.id] ?? ""} onChange={e => setFeedbackDraft(old => ({ ...old, [s.id]: e.target.value }))}/></label></div><button style={{ ...primary, marginTop: 10 }} onClick={() => saveGrade(s)}>Save grade privately</button></article>)}</div>}
      </section></div>}
    <p style={{ color: "#8E8E83", fontSize: 12, marginTop: 18 }}>Teacher workspace · Data is stored in Firestore. Student-side pages must query this shared schema before assignments and results are synchronized end-to-end.</p>
  </main>;
}
