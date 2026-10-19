"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Activity, AlarmClock, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, BookOpen,
  CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, ClipboardCheck,
  Clock3, FileText, GraduationCap, LayoutDashboard, Menu, MessageSquare, MoreHorizontal,
  Plus, Search, Settings, Sparkles, Users, X, type LucideIcon
} from "lucide-react";
import { firebaseConfigured } from "@/lib/firebase/client";

type NavItem = { label: string; icon: LucideIcon };
const primaryNav: NavItem[] = [
	
  { label: "Dashboard", icon: LayoutDashboard }, { label: "My courses", icon: BookOpen },
  { label: "Timetable", icon: CalendarDays },
  { label: "Grades", icon: GraduationCap },
   { label: "Assignments", icon: FileText },
   { label: "Students", icon: Users },
  { label: "Messages", icon: MessageSquare },
];
const courses = [
  { code: "CS 301", title: "Data Structures", students: 64, pending: 8, progress: 78, tone: "violet", art: "{ }", term: "SEMESTER 5" },
  { code: "CS 305", title: "Database Systems", students: 52, pending: 3, progress: 62, tone: "blue", art: "▤", term: "SEMESTER 5" },
  { code: "CS 307", title: "Computer Networks", students: 48, pending: 6, progress: 84, tone: "teal", art: "⌘", term: "SEMESTER 5" },
];
const initialTasks = [
  { id: 1, title: "Review Assignment 04", detail: "Data Structures · 8 submissions", due: "Due today", urgent: true, done: false },
  { id: 2, title: "Grade DBMS lab reports", detail: "Database Systems · 3 submissions", due: "Tomorrow", urgent: false, done: false },
  { id: 3, title: "Publish quiz results", detail: "Computer Networks · Quiz 02", due: "Oct 15", urgent: false, done: true },
];
const schedule = [
  { time: "09:00", end: "09:50", title: "Data Structures", meta: "CS 301 · Room B-204", color: "purple", kind: "Lecture" },
  { time: "10:00", end: "10:50", title: "Database Systems", meta: "CS 305 · Lab 1", color: "blue", kind: "Practical" },
  { time: "12:00", end: "12:30", title: "Student office hours", meta: "Faculty room · Open consultation", color: "green", kind: "Office hours" },
  { time: "14:00", end: "14:50", title: "Computer Networks", meta: "CS 307 · Room A-103", color: "orange", kind: "Lecture" },
];

function Avatar({ initials, tone = "indigo", small = false }: { initials: string; tone?: string; small?: boolean }) {
  return <div className={`avatar ${tone} ${small ? "avatar-small" : ""}`}>{initials}</div>;
}
function SectionTitle({ title, action }: { title: string; action?: string }) {
  return <div className="section-title"><h2>{title}</h2>{action && <button className="text-link">{action}<ArrowRight size={14}/></button>}</div>;
}

export default function TeacherDashboard() {
 const router = useRouter();
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [tasks, setTasks] = useState(initialTasks);
  const [showCreate, setShowCreate] = useState(false);
  const [notice, setNotice] = useState("");
  const [monthOffset, setMonthOffset] = useState(0);
  const filteredCourses = useMemo(() => courses.filter(c => `${c.code} ${c.title}`.toLowerCase().includes(search.toLowerCase())), [search]);
  const today = new Date(2026, 9, 13 + monthOffset * 0);
  const monthName = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date(2026, 9 + monthOffset, 1));
  const monthStart = new Date(2026, 9 + monthOffset, 1).getDay();
  const daysInMonth = new Date(2026, 10 + monthOffset, 0).getDate();

function navTo(label: string) {
  setActiveNav(label);
  setMobileMenu(false);
  setNotice("");

  const routes: Record<string, string> = {
    Dashboard: "/dashboard",
    "My courses": "/courses",
    Assignments: "/teacher/assignments",
    Students: "/teacher/students",
    Grades: "/teacher/grades",
    Settings: "/teacher/settings",
    
  };

  const path = routes[label];

  if (path) {
    if (path !== "/dashboard") {
      router.push(path);
    }
  } else {
    setNotice(`${label} page is not implemented yet.`);
  }
}
  return <div className="app-shell">
    {mobileMenu && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileMenu(false)} />}
    <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
      <div className="brand"><div className="brand-mark"><GraduationCap size={22}/></div><span>UniLearn</span><span className="brand-beta">BETA</span><button className="mobile-close" onClick={() => setMobileMenu(false)} aria-label="Close menu"><X size={18}/></button></div>
      <div className="institution-switch"><div className="institution-icon">N</div><div><strong>Northstar University</strong><span>Faculty workspace</span></div><ChevronDown size={15}/></div>
      <div className="nav-label">WORKSPACE</div>
      <nav className="nav-list">{primaryNav.map(item => { const Icon = item.icon; return <button key={item.label} onClick={() => navTo(item.label)} className={`nav-item ${activeNav === item.label ? "active" : ""}`}><Icon size={18}/><span>{item.label}</span>{item.label === "Messages" && <span className="nav-count">3</span>}</button>; })}</nav>
      <div className="nav-label tools-label">PREFERENCES</div>
      <nav className="nav-list"><button className="nav-item" onClick={() => navTo("Settings")}><Settings size={18}/><span>Settings</span></button><button className="nav-item" onClick={() => navTo("Help & support")}><CircleHelp size={18}/><span>Help & support</span></button></nav>
      <div className="sidebar-bottom"><div className="upgrade-card"><div className="upgrade-icon"><Sparkles size={17}/></div><strong>Teach smarter</strong><p>Your academic workspace, all in one place.</p><button onClick={() => setNotice("AI tools are planned for a later release.")}>Explore what's next <ArrowRight size={13}/></button></div><div className="profile-row"><Avatar initials="EC"/><div className="profile-info"><strong>Dr. Emily Carter</strong><span>Computer Science</span></div><MoreHorizontal size={18}/></div></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="menu-trigger" aria-label="Open navigation" onClick={() => setMobileMenu(true)}><Menu size={21}/></button><div className="breadcrumb">Workspace <span>/</span> <strong>{activeNav}</strong></div></div><div className="topbar-actions"><label className="search-box"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses, students, resources..."/><kbd>⌘ K</kbd></label><button className="icon-button notification-button" aria-label="Notifications" onClick={() => setNotice("You're all caught up on notifications.")}><Bell size={19}/><i/></button><div className="top-profile"><Avatar initials="EC" small/><div><strong>Dr. Emily Carter</strong><span>Faculty · Computer Science</span></div><ChevronDown size={15}/></div></div></header>

      <div className="page-content">
        <div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-dot"/> TUESDAY, OCTOBER 13, 2026</div><h1>Good afternoon, Dr. Carter <span className="wave">✳</span></h1><p>Here's your teaching overview. Let's make today count.</p></div><button className="primary-button" onClick={() => setShowCreate(true)}><Plus size={17}/> Create new</button></div>
        {!firebaseConfigured && <div className="firebase-notice"><div className="firebase-notice-icon"><Activity size={18}/></div><div><strong>Preview mode · Firebase not connected</strong><p>This dashboard uses sample data. Add your Firebase project credentials to enable backend integration.</p></div><button onClick={() => setNotice("Next step: create a Firebase project, enable Authentication and Firestore, then fill in .env.local.")}>Setup guide <ArrowRight size={14}/></button></div>}
        {notice && <div className="inline-notice" role="status"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss"><X size={15}/></button></div>}

        <section className="stats-grid" aria-label="Teaching overview">
          <div className="stat-card"><div className="stat-top"><div className="stat-icon lavender"><BookOpen size={19}/></div><span className="stat-trend positive"><ArrowUpRight size={14}/> +1</span></div><div className="stat-value">06</div><div className="stat-label">Active courses</div><div className="stat-foot">Across 3 student batches</div></div>
          <div className="stat-card"><div className="stat-top"><div className="stat-icon sky"><Users size={19}/></div><span className="stat-trend positive"><ArrowUpRight size={14}/> 8.4%</span></div><div className="stat-value">192</div><div className="stat-label">Students enrolled</div><div className="stat-foot">Compared with last semester</div></div>
          <div className="stat-card"><div className="stat-top"><div className="stat-icon peach"><FileText size={19}/></div><span className="stat-trend warning"><Clock3 size={13}/> Action needed</span></div><div className="stat-value">17</div><div className="stat-label">Pending submissions</div><div className="stat-foot">Across 4 assignments</div></div>
          <div className="stat-card"><div className="stat-top"><div className="stat-icon mint"><MessageSquare size={19}/></div><span className="stat-trend neutral">This week</span></div><div className="stat-value">08</div><div className="stat-label">Unread messages</div><div className="stat-foot">3 student questions need replies</div></div>
        </section>

        <div className="content-grid">
          <div className="left-column">
            <section className="panel courses-panel"><SectionTitle title="My courses" action="View all courses"/><div className="course-grid">{filteredCourses.map((course, index) => <article className="course-card" key={course.code}><div className={`course-art ${course.tone}`}><span className="course-term">{course.term}</span><span className="course-glyph">{course.art}</span><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-orbit orbit-three"/></div><div className="course-body"><div className="course-code">{course.code}<button className="tiny-more" aria-label={`More options for ${course.title}`} onClick={() => setNotice(`More options for ${course.title} will be added with course management.`)}><MoreHorizontal size={17}/></button></div><h3>{course.title}</h3><div className="course-meta"><span><Users size={14}/>{course.students} students</span><span><ClipboardCheck size={14}/>{course.pending} to review</span></div><div className="progress-line"><span style={{ width: `${course.progress}%` }}/></div><div className="course-footer"><span>{course.progress}% course progress</span><button onClick={() => navTo("My courses")} aria-label={`Open ${course.title}`}><ArrowRight size={16}/></button></div></div></article>)}</div>{filteredCourses.length === 0 && <div className="empty-state">No courses match “{search}”. Try another search.</div>}</section>

            <section className="panel schedule-panel"><SectionTitle title="Today's schedule" action="Open timetable"/><div className="schedule-date"><div><strong>Tuesday, October 13</strong><span>4 events · 3 teaching sessions</span></div><button className="outline-button" onClick={() => navTo("Timetable")}><CalendarDays size={15}/> Full timetable</button></div><div className="schedule-list">{schedule.map((item, index) => <div className="schedule-item" key={item.title}><div className="schedule-time"><strong>{item.time}</strong><span>{item.end}</span></div><div className={`schedule-marker ${item.color}`}><i/></div><div className={`schedule-detail ${item.color}`}><div className="schedule-detail-top"><span className="event-kind">{item.kind}</span><span className="event-duration">50 min</span></div><h3>{item.title}</h3><p>{item.meta}</p></div></div>)}</div></section>
          </div>

          <div className="right-column">
            <section className="panel tasks-panel"><SectionTitle title="Tasks to review" action="View all"/><div className="task-summary"><div><span className="task-summary-number">{tasks.filter(t => !t.done).length}</span><span>items need attention</span></div><div className="task-ring"><span>{Math.round(tasks.filter(t => t.done).length / tasks.length * 100)}%</span></div></div><div className="task-list">{tasks.map(task => <label key={task.id} className={`task-item ${task.done ? "task-done" : ""}`}><button className={`task-check ${task.done ? "checked" : ""}`} onClick={() => setTasks(old => old.map(t => t.id === task.id ? { ...t, done: !t.done } : t))} aria-label={task.done ? "Mark incomplete" : "Mark complete"}>{task.done && <Check size={13}/>}</button><div className="task-copy"><strong>{task.title}</strong><span>{task.detail}</span><em className={task.urgent && !task.done ? "urgent" : ""}>{task.due}</em></div><button className="task-more" aria-label="Task options" onClick={() => setNotice(`Task: ${task.title}`)}><MoreHorizontal size={17}/></button></label>)}</div><button className="secondary-button full-width" onClick={() => navTo("Assignments")}>Open assignment centre <ArrowRight size={15}/></button></section>

            <section className="panel calendar-panel"><div className="calendar-heading"><div><h2>Calendar</h2><p>Keep your week in view</p></div><div className="calendar-controls"><button aria-label="Previous month" onClick={() => setMonthOffset(m => m - 1)}><ChevronLeft size={17}/></button><button aria-label="Next month" onClick={() => setMonthOffset(m => m + 1)}><ChevronRight size={17}/></button></div></div><div className="calendar-month">{monthName}</div><div className="calendar-grid">{["S","M","T","W","T","F","S"].map((d,i)=><span className="calendar-weekday" key={`${d}${i}`}>{d}</span>)}{Array.from({length: monthStart}, (_,i)=><span key={`blank-${i}`} />)}{Array.from({length: daysInMonth},(_,i)=>i+1).map(d=><button key={d} className={`calendar-day ${d === 13 && monthOffset === 0 ? "selected" : ""} ${[15,18,22,27].includes(d) ? "has-event" : ""}`} onClick={() => setNotice(`Calendar date selected: ${monthName.split(" ")[0]} ${d}. Connect Firestore to load real events.`)}>{d}</button>)}</div><div className="calendar-legend"><span><i className="legend-dot blue-dot"/> Classes</span><span><i className="legend-dot orange-dot"/> Deadlines</span></div></section>

            <section className="panel activity-panel"><SectionTitle title="Recent activity"/><div className="activity-list"><div className="activity-item"><Avatar initials="AS" tone="rose" small/><div><p><strong>Arjun Singh</strong> submitted <b>Assignment 04</b></p><span>Data Structures · 18 min ago</span></div><span className="activity-dot blue-dot"/></div><div className="activity-item"><Avatar initials="MP" tone="mint-tone" small/><div><p><strong>Meera Patel</strong> asked a question</p><span>Database Systems · 42 min ago</span></div><span className="activity-dot orange-dot"/></div><div className="activity-item"><Avatar initials="RK" tone="gold" small/><div><p><strong>Rohan Kumar</strong> viewed course notes</p><span>Computer Networks · 1 hr ago</span></div></div></div><button className="activity-link" onClick={() => navTo("Messages")}>View class activity <ArrowRight size={14}/></button></section>
          </div>
        </div>
        <footer className="footer"><span>© 2026 UniLearn Academic Workspace</span><span><i/> All systems operational</span><button onClick={() => setNotice("Help centre is planned for the next build.")}>Help centre</button></footer>
      </div>
    </main>
    {showCreate && <div className="modal-backdrop" role="presentation" onClick={() => setShowCreate(false)}><div className="create-modal" role="dialog" aria-modal="true" aria-labelledby="create-title" onClick={e => e.stopPropagation()}><div className="modal-heading"><div><span className="eyebrow">QUICK ACTION</span><h2 id="create-title">What would you like to create?</h2></div><button className="icon-button" onClick={() => setShowCreate(false)} aria-label="Close"><X size={18}/></button></div><div className="create-options"><button onClick={() => {setShowCreate(false); navTo("My courses");}}><span className="create-option-icon lavender"><BookOpen size={20}/></span><span><strong>Course material</strong><small>Share notes, slides or a resource</small></span><ArrowRight size={16}/></button><button onClick={() => {setShowCreate(false); navTo("Assignments");}}><span className="create-option-icon sky"><FileText size={20}/></span><span><strong>Assignment</strong><small>Set work and a due date</small></span><ArrowRight size={16}/></button><button onClick={() => {setShowCreate(false); navTo("Timetable");}}><span className="create-option-icon mint"><CalendarDays size={20}/></span><span><strong>Schedule event</strong><small>Add a lecture or office hour</small></span><ArrowRight size={16}/></button><button onClick={() => {setShowCreate(false); setNotice("Announcement creation will be added in the course-management phase.");}}><span className="create-option-icon peach"><MessageSquare size={20}/></span><span><strong>Announcement</strong><small>Notify a class or course</small></span><ArrowRight size={16}/></button></div><p className="modal-footnote">These actions are UI placeholders until Firebase data workflows are connected.</p></div></div>}
  </div>;
}
