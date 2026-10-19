 "use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight, CalendarClock, CheckCircle2, Clock3, FileText,
  Filter, Paperclip, Search, UploadCloud, XCircle
} from "lucide-react";
import styles from "./assignments.module.css";

type Assignment = {
  id: string;
  title: string;
  course: string;
  code: string;
  kind: "Assignment" | "Quiz" | "Unit Test" | "Lab";
  due: string;
  dueISO: string;
  marks: number;
  status: "Pending" | "Submitted" | "Graded" | "Missed";
  instructions: string;
  allowedFormats?: string;
};

const initialItems: Assignment[] = [
  {
    id: "a1", title: "SQL Query Practice", course: "Database Management Systems",
    code: "CS301", kind: "Assignment", due: "Oct 21, 2026 · 11:59 PM",
    dueISO: "2026-10-21T23:59:00", marks: 20, status: "Pending",
    instructions: "Write SQL queries for the supplied schema. Include SELECT, JOIN, GROUP BY and subquery examples. Submit one PDF with query output screenshots.",
    allowedFormats: "PDF (max 10 MB)"
  },
  {
    id: "a2", title: "Trees & Graphs — Online Quiz", course: "Data Structures & Algorithms",
    code: "CS302", kind: "Quiz", due: "Oct 22, 2026 · 5:00 PM",
    dueISO: "2026-10-22T17:00:00", marks: 15, status: "Pending",
    instructions: "15 multiple-choice questions covering binary trees, traversals, BFS and DFS. One attempt; the timer starts when you begin."
  },
  {
    id: "a3", title: "Numerical Methods Worksheet", course: "Engineering Mathematics",
    code: "MA301", kind: "Assignment", due: "Oct 24, 2026 · 10:00 AM",
    dueISO: "2026-10-24T10:00:00", marks: 10, status: "Submitted",
    instructions: "Solve the assigned Newton-Raphson and interpolation problems. Show each step of the calculation and box the final answer.",
    allowedFormats: "PDF (max 10 MB)"
  },
  {
    id: "a4", title: "Network Layer Lab Record", course: "Computer Networks",
    code: "CS303", kind: "Lab", due: "Oct 26, 2026 · 4:00 PM",
    dueISO: "2026-10-26T16:00:00", marks: 25, status: "Pending",
    instructions: "Document the IP addressing and routing exercises completed in class. Add terminal outputs and a short conclusion.",
    allowedFormats: "PDF (max 15 MB)"
  },
  {
    id: "a5", title: "Unit Test 1 — DBMS", course: "Database Management Systems",
    code: "CS301", kind: "Unit Test", due: "Oct 15, 2026 · In class",
    dueISO: "2026-10-15T09:00:00", marks: 20, status: "Graded",
    instructions: "In-class assessment covering ER models, relational algebra and normalization. Marks are shown in Grades."
  },
];

export default function StudentAssignmentsPage() {
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState<Assignment | null>(null);
  const [notice, setNotice] = useState("");
  const [fileNames, setFileNames] = useState<Record<string, string>>({});

  const visibleItems = useMemo(() => items.filter((item) => {
    const matchesQuery = `${item.title} ${item.course} ${item.code}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "All" || item.status === filter;
    return matchesQuery && matchesFilter;
  }), [items, query, filter]);

  const pending = items.filter((item) => item.status === "Pending").length;
  const submitted = items.filter((item) => item.status === "Submitted").length;
  const graded = items.filter((item) => item.status === "Graded").length;

  function submitItem(id: string) {
    const item = items.find((entry) => entry.id === id);
    if (!fileNames[id]) {
      setNotice("Choose a file before marking this assignment as submitted.");
      return;
    }
    setItems((current) => current.map((entry) => entry.id === id ? { ...entry, status: "Submitted" } : entry));
    setSelected(null);
    setNotice(`“${item?.title}” marked as submitted in this preview. Connect Firebase Storage/Firestore to save submissions permanently.`);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>STUDENT WORKSPACE</div>
          <h1>Assignments <span>&amp; tasks</span></h1>
          <p>Review instructions, keep track of deadlines, and manage your submissions.</p>
        </div>
        <div className={styles.headerIcon}><FileText size={25} /></div>
      </header>

      <section className={styles.stats}>
        <article><span>To do</span><strong>{pending.toString().padStart(2, "0")}</strong><small>Needs your attention</small></article>
        <article><span>Submitted</span><strong>{submitted.toString().padStart(2, "0")}</strong><small>Awaiting review</small></article>
        <article><span>Graded</span><strong>{graded.toString().padStart(2, "0")}</strong><small>Marks available in Grades</small></article>
      </section>

      <section className={styles.toolbar}>
        <label className={styles.search}><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search assignments or courses" /></label>
        <label className={styles.filter}><Filter size={16} /><select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by status"><option>All</option><option>Pending</option><option>Submitted</option><option>Graded</option><option>Missed</option></select></label>
      </section>

      {notice && <div className={styles.notice} role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss message"><XCircle size={16} /></button></div>}

      <section className={styles.list}>
        {visibleItems.map((item) => (
          <article className={styles.assignment} key={item.id}>
            <div className={styles.fileIcon}><FileText size={21} /></div>
            <div className={styles.details}>
              <div className={styles.tags}><span className={styles.courseCode}>{item.code}</span><span className={styles.kind}>{item.kind}</span></div>
              <h2>{item.title}</h2>
              <p>{item.course}</p>
              <div className={styles.meta}><span><CalendarClock size={14} /> Due: {item.due}</span><span><CheckCircle2 size={14} /> Max marks: {item.marks}</span></div>
            </div>
            <div className={styles.actionColumn}>
              <span className={`${styles.status} ${styles[item.status.toLowerCase()]}`}>{item.status}</span>
              <button className={styles.detailsButton} onClick={() => setSelected(item)}>View details <ArrowUpRight size={15} /></button>
            </div>
          </article>
        ))}
        {visibleItems.length === 0 && <div className={styles.empty}>No items match those filters.</div>}
      </section>

      {selected && (
        <div className={styles.overlay} role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
          <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="assignment-title">
            <button className={styles.close} onClick={() => setSelected(null)} aria-label="Close details"><XCircle size={20} /></button>
            <div className={styles.eyebrow}>{selected.code} · {selected.kind}</div>
            <h2 id="assignment-title">{selected.title}</h2>
            <p className={styles.modalCourse}>{selected.course}</p>
            <div className={styles.detailGrid}>
              <div><span>Deadline</span><strong>{selected.due}</strong></div>
              <div><span>Maximum marks</span><strong>{selected.marks}</strong></div>
              <div><span>Status</span><strong>{selected.status}</strong></div>
            </div>
            <h3>Instructions from your teacher</h3>
            <p className={styles.instructions}>{selected.instructions}</p>
            {selected.allowedFormats && <p className={styles.format}><Paperclip size={15} /> Accepted submission: {selected.allowedFormats}</p>}
            {selected.status === "Pending" && selected.kind !== "Quiz" && selected.kind !== "Unit Test" && (
              <div className={styles.upload}>
                <label htmlFor="submission-file"><UploadCloud size={18} /> Select your completed file</label>
                <input id="submission-file" type="file" accept=".pdf,.doc,.docx,.zip,.txt,.png,.jpg,.jpeg" onChange={(e) => setFileNames((old) => ({ ...old, [selected.id]: e.target.files?.[0]?.name ?? "" }))} />
                {fileNames[selected.id] && <small>Selected: {fileNames[selected.id]}</small>}
              </div>
            )}
            {selected.kind === "Quiz" && selected.status === "Pending" && <p className={styles.noticeInline}><Clock3 size={15} /> Quiz launch can be connected when the online quiz module is implemented.</p>}
            <div className={styles.modalActions}>
              <button className={styles.secondaryButton} onClick={() => setSelected(null)}>Close</button>
              {selected.status === "Pending" && selected.kind !== "Quiz" && selected.kind !== "Unit Test" && <button className={styles.primaryButton} onClick={() => submitItem(selected.id)}>Submit assignment</button>}
            </div>
          </section>
        </div>
      )}
      <p className={styles.disclaimer}>Preview data only · Assignments, submissions, quiz attempts and grades will need to be connected to your institution’s Firestore data before launch.</p>
    </main>
  );
}
