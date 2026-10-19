 "use client";

import { useMemo, useState } from "react";
import { Award, BarChart3, BookOpen, ChevronDown, ClipboardCheck, GraduationCap, TrendingUp } from "lucide-react";
import styles from "./grades.module.css";

type Mark = { id: string; course: string; code: string; assessment: string; category: "MST" | "Unit test" | "Online quiz" | "Assignment" | "Lab"; date: string; obtained: number; total: number; feedback?: string };

const marks: Mark[] = [
  { id:"m1", course:"Database Management Systems", code:"CS301", assessment:"MST 1", category:"MST", date:"Sep 18, 2026", obtained:24, total:30, feedback:"Good understanding of ER modelling. Revise normalization examples." },
  { id:"m2", course:"Database Management Systems", code:"CS301", assessment:"Unit Test 1", category:"Unit test", date:"Oct 15, 2026", obtained:16, total:20, feedback:"Strong SQL answers; improve explanations of relational algebra." },
  { id:"m3", course:"Database Management Systems", code:"CS301", assessment:"SQL Practice Quiz", category:"Online quiz", date:"Oct 08, 2026", obtained:9, total:10 },
  { id:"m4", course:"Data Structures & Algorithms", code:"CS302", assessment:"MST 1", category:"MST", date:"Sep 20, 2026", obtained:21, total:30, feedback:"Review tree traversal complexity and graph terminology." },
  { id:"m5", course:"Data Structures & Algorithms", code:"CS302", assessment:"Trees & Graphs Quiz", category:"Online quiz", date:"Oct 12, 2026", obtained:12, total:15 },
  { id:"m6", course:"Engineering Mathematics", code:"MA301", assessment:"MST 1", category:"MST", date:"Sep 22, 2026", obtained:26, total:30 },
  { id:"m7", course:"Engineering Mathematics", code:"MA301", assessment:"Unit Test 1", category:"Unit test", date:"Oct 09, 2026", obtained:17, total:20 },
  { id:"m8", course:"Computer Networks", code:"CS303", assessment:"MST 1", category:"MST", date:"Sep 24, 2026", obtained:19, total:30, feedback:"Revisit subnetting and OSI layer responsibilities." },
  { id:"m9", course:"Computer Networks", code:"CS303", assessment:"Network Basics Quiz", category:"Online quiz", date:"Oct 11, 2026", obtained:13, total:15 },
  { id:"m10", course:"Engineering Mathematics", code:"MA301", assessment:"Numerical Methods Worksheet", category:"Assignment", date:"Oct 16, 2026", obtained:8, total:10 },
];

const courses = ["All courses", ...Array.from(new Set(marks.map((m) => m.course)))];
const categories = ["All assessments", "MST", "Unit test", "Online quiz", "Assignment", "Lab"];

export default function StudentGradesPage() {
  const [course, setCourse] = useState("All courses");
  const [category, setCategory] = useState("All assessments");
  const [expanded, setExpanded] = useState<string | null>("m1");

  const visible = useMemo(() => marks.filter((m) =>
    (course === "All courses" || m.course === course) &&
    (category === "All assessments" || m.category === category)
  ), [course, category]);

  const totalObtained = visible.reduce((sum, m) => sum + m.obtained, 0);
  const totalPossible = visible.reduce((sum, m) => sum + m.total, 0);
  const percentage = totalPossible ? Math.round((totalObtained / totalPossible) * 100) : 0;
  const mst = visible.filter((m) => m.category === "MST");
  const quiz = visible.filter((m) => m.category === "Online quiz");

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>ACADEMIC PERFORMANCE</div>
          <h1>Grades <span>&amp; results</span></h1>
          <p>Track MSTs, classroom unit tests, online quizzes, assignments and teacher feedback.</p>
        </div>
        <div className={styles.headerIcon}><GraduationCap size={26} /></div>
      </header>

      <section className={styles.summary}>
        <article className={styles.summaryMain}>
          <div className={styles.summaryLabel}><Award size={17} /> Current filtered average</div>
          <div className={styles.bigNumber}>{percentage}<small>%</small></div>
          <div className={styles.progress}><span style={{ width: `${percentage}%` }} /></div>
          <p>{totalObtained} marks earned out of {totalPossible} possible across {visible.length} published assessments.</p>
        </article>
        <article className={styles.metric}><div className={styles.metricIcon}><ClipboardCheck size={18} /></div><span>MST records</span><strong>{mst.length}</strong><small>Published marks</small></article>
       <article className={styles.metric}>
  <div className={`${styles.metricIcon} ${styles.copper}`}>
    <BookOpen size={18} />
  </div>
  <span>Online quizzes</span>
  <strong>{quiz.length}</strong>
  <small>Published results</small>
</article>
        </section>

      <section className={styles.filters}>
        <label>Course<select value={course} onChange={(e) => setCourse(e.target.value)}>{courses.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label>Assessment type<select value={category} onChange={(e) => setCategory(e.target.value)}>{categories.map((c) => <option key={c}>{c}</option>)}</select></label>
        <div className={styles.filterHint}><BarChart3 size={16} /> {visible.length} result{visible.length === 1 ? "" : "s"}</div>
      </section>

      <section className={styles.results}>
        <div className={styles.resultsHeader}><div><div className={styles.eyebrow}>MARKS REGISTER</div><h2>Assessment history</h2></div><span>Obtained / maximum</span></div>
        {visible.map((mark) => {
          const pct = Math.round((mark.obtained / mark.total) * 100);
          const isOpen = expanded === mark.id;
          return (
            <article className={styles.markRow} key={mark.id}>
              <button className={styles.markButton} onClick={() => setExpanded(isOpen ? null : mark.id)} aria-expanded={isOpen}>
                <div className={styles.markType}><span>{mark.category}</span><small>{mark.code}</small></div>
                <div className={styles.markInfo}><strong>{mark.assessment}</strong><span>{mark.course}</span><small>{mark.date}</small></div>
                <div className={styles.markScore}><strong>{mark.obtained}<span> / {mark.total}</span></strong><div className={styles.miniTrack}><span style={{ width: `${pct}%` }} /></div><small>{pct}%</small></div>
                <ChevronDown className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`} size={18} />
              </button>
              {isOpen && <div className={styles.feedback}><div className={styles.feedbackTitle}><TrendingUp size={15} /> Performance feedback</div><p>{mark.feedback || "No written feedback has been added for this assessment yet."}</p></div>}
            </article>
          );
        })}
        {visible.length === 0 && <div className={styles.empty}>No marks are available for this filter.</div>}
      </section>
      <div className={styles.note}><strong>Important:</strong> These are illustrative preview marks. In the live app, this page should show only results published for the signed-in student by authorized teachers or administrators.</div>
    </main>
  );
}
