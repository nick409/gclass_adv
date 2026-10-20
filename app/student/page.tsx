
"use client";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  BarChart3,
  Settings,
  Search,
  Bell,
  ChevronRight,
  Clock3,
  ArrowUpRight,
  CheckCircle2,
  Circle,
  GraduationCap,
  Menu,
  X,
  Play,
  FileText,
  Video,
  Code2,
  Palette,
  Calculator,
  LogOut,
} from "lucide-react";
import styles from "./student-dashboard.module.css";

const courses = [
  {
    title: "Database Management Systems",
    code: "CS301",
    instructor: "Dr. Ananya Sharma",
    progress: 72,
    next: "Normalization & SQL",
    icon: DatabaseIcon,
    tone: "violet",
  },
  {
    title: "Data Structures & Algorithms",
    code: "CS302",
    instructor: "Prof. Rahul Verma",
    progress: 58,
    next: "Trees and Graphs",
    icon: Code2,
    tone: "blue",
  },
  {
    title: "Engineering Mathematics",
    code: "MA301",
    instructor: "Dr. Neha Patel",
    progress: 84,
    next: "Numerical Methods",
    icon: Calculator,
    tone: "amber",
  },
  {
    title: "Computer Networks",
    code: "CS303",
    instructor: "Prof. Arjun Mehta",
    progress: 41,
    next: "Network Layer",
    icon: Palette,
    tone: "green",
  },
];

const assignments = [
  {
    title: "SQL Query Practice",
    course: "Database Management Systems",
    due: "Today, 11:59 PM",
    tag: "Due today",
    tone: "urgent",
    type: "Assignment",
  },
  {
    title: "Binary Tree Implementation",
    course: "Data Structures & Algorithms",
    due: "Tomorrow, 5:00 PM",
    tag: "Tomorrow",
    tone: "warning",
    type: "Coding task",
  },
  {
    title: "Numerical Methods Worksheet",
    course: "Engineering Mathematics",
    due: "Oct 16, 10:00 AM",
    tag: "In 3 days",
    tone: "normal",
    type: "Worksheet",
  },
];

const schedule = [
  { time: "09:00 AM", end: "09:50 AM", name: "Database Management Systems", room: "Room 204", code: "CS301", tone: "violet" },
  { time: "10:00 AM", end: "10:50 AM", name: "Computer Networks", room: "Room 108", code: "CS303", tone: "blue" },
  { time: "11:00 AM", end: "11:50 AM", name: "Engineering Mathematics", room: "Room 305", code: "MA301", tone: "amber" },
];

type IconType = typeof LayoutDashboard;

function DatabaseIcon(props: React.ComponentProps<typeof BookOpen>) {
  return <BookOpen {...props} />;
}

export default function StudentDashboard() {
const router = useRouter();
const pathname = usePathname();

const activeTab =
  pathname === "/student"
    ? "Overview"
    : pathname.startsWith("/student/assignments")
      ? "Assignments"
      : pathname.startsWith("/student/grades")
        ? "Grades"
        : pathname.startsWith("/student/courses")
          ? "My Courses"
          : pathname.startsWith("/student/timetable")
            ? "Timetable"
            : pathname.startsWith("/student/settings")
              ? "Settings"
              : "Overview";
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [completed, setCompleted] = useState<number[]>([0]);
const navItems: {
  label: string;
  icon: IconType;
  href: string;
}[] = [
  { label: "Overview", icon: LayoutDashboard, href: "/student" },
  { label: "My Courses", icon: BookOpen, href: "/student/courses" },
  { label: "Assignments", icon: ClipboardCheck, href: "/student/assignments" },
  { label: "Timetable", icon: CalendarDays, href: "/student/timetable" },
  { label: "Grades", icon: BarChart3, href: "/student/grades" },
];

  const filteredAssignments = assignments.filter((assignment) =>
    `${assignment.title} ${assignment.course}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  return (
    <main className={styles.app}>
      {mobileNavOpen && (
        <button
          className={styles.mobileBackdrop}
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <aside className={`${styles.sidebar} ${mobileNavOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.brand}>
          <div className={styles.brandMark}><GraduationCap size={23} /></div>
          <div>
            <div className={styles.brandName}>UniLearn</div>
            <div className={styles.brandCaption}>STUDENT PORTAL</div>
          </div>
          <button
            className={styles.closeNav}
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.profileMini}>
          <div className={styles.avatar}>S</div>
          <div className={styles.profileText}>
            <strong>Student Account</strong>
            <span>B.Tech · Computer Science</span>
          </div>
        </div>

        <div className={styles.navLabel}>WORKSPACE</div>
        <nav className={styles.nav}>
{navItems.map(({ label, icon: Icon, href }) => (
  <button
    key={label}
    className={`${styles.navItem} ${
      activeTab === label ? styles.navActive : ""
    }`}
    onClick={() => {
      setMobileNavOpen(false);
      router.push(href);
    }}
  >
    <Icon size={18} />
    <span>{label}</span>
    {label === "Assignments" && (
      <span className={styles.navCount}>3</span>
    )}
  </button>
))}
        </nav>

        <div className={styles.navLabel}>PERSONAL</div>
        <nav className={styles.nav}>
         <button
  className={`${styles.navItem} ${
    pathname === "/student/settings" ? styles.navActive : ""
  }`}
  onClick={() => {
    setMobileNavOpen(false);
    router.push("/student/settings");
  }}
>
  <Settings size={18} />
  <span>Settings</span>
</button>
        </nav>

        <div className={styles.sidebarBottom}>
          <div className={styles.helpCard}>
            <div className={styles.helpIcon}><GraduationCap size={18} /></div>
            <strong>Keep learning.</strong>
            <p>Small steps today, big achievements tomorrow.</p>
          </div>
          <div className={styles.sidebarFoot}>
            <span className={styles.statusDot} />
            Academic session 2026–27
          </div>
        </div>
      </aside>

      <section className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button
              className={styles.menuButton}
              aria-label="Open navigation"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu size={21} />
            </button>
            <div className={styles.breadcrumb}>
              <span>Workspace</span><ChevronRight size={14} /><strong>{activeTab}</strong>
            </div>
          </div>

          <div className={styles.topbarActions}>
            <label className={styles.search}>
              <Search size={17} />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search courses, tasks..."
                aria-label="Search courses and assignments"
              />
              <kbd>⌘ K</kbd>
            </label>
            <button className={styles.iconButton} aria-label="Notifications">
              <Bell size={19} /><span className={styles.notificationDot} />
            </button>
            <div className={styles.topAvatar}>S</div>
          </div>
        </header>

        <div className={styles.content}>
          <section className={styles.welcome}>
            <div>
              <div className={styles.dateLine}><span className={styles.liveDot} /> YOUR LEARNING SPACE</div>
              <h1>Hey there, <span>Student</span> <span className={styles.wave}>✦</span></h1>
              <p>Keep your momentum going. Here&apos;s what&apos;s happening with your studies.</p>
            </div>
            <div className={styles.welcomeDate}>
              <CalendarDays size={17} />
              <span>Tuesday, October 13</span>
            </div>
          </section>

          <section className={styles.statsGrid}>
            <StatCard label="Enrolled courses" value="06" detail="This semester" icon={BookOpen} tone="violet" />
            <StatCard label="Pending assignments" value="03" detail="One due today" icon={ClipboardCheck} tone="amber" />
            <StatCard label="Learning progress" value="68%" detail="Across all courses" icon={BarChart3} tone="green" />
            <StatCard label="Attendance" value="94%" detail="Great consistency!" icon={CheckCircle2} tone="blue" />
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <div>
                <div className={styles.eyebrow}>YOUR CLASSROOM</div>
                <h2>Continue learning</h2>
                <p>Pick up where you left off.</p>
              </div>
              <button className={styles.textButton} onClick={() => router.push("/student/courses")}>
                All courses <ArrowUpRight size={16} />
              </button>
            </div>

            <div className={styles.courseGrid}>
              {courses.map((course) => {
                const Icon = course.icon;
                return (
                  <article key={course.code} className={styles.courseCard}>
                    <div className={styles.courseTop}>
                      <div className={`${styles.courseIcon} ${styles[course.tone]}`}><Icon size={21} /></div>
                      <span className={styles.courseCode}>{course.code}</span>
                    </div>
                    <h3>{course.title}</h3>
                    <p className={styles.instructor}>{course.instructor}</p>
                    <div className={styles.progressMeta}>
                      <span>Course progress</span><strong>{course.progress}%</strong>
                    </div>
                    <div className={styles.progressTrack}>
                      <div className={`${styles.progressFill} ${styles[`${course.tone}Fill`]}`} style={{ width: `${course.progress}%` }} />
                    </div>
                    <div className={styles.courseNext}>
                      <div><span className={styles.nextLabel}>UP NEXT</span><strong>{course.next}</strong></div>
                      <button className={styles.playButton} aria-label={`Continue ${course.title}`} onClick={() => router.push("/student/courses")}><Play size={15} fill="currentColor" /></button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
          <div className={styles.lowerGrid}>
            <section className={styles.panel}>
              <div className={styles.panelHeading}>
                <div><div className={styles.eyebrow}>STAY ON TRACK</div><h2>Upcoming assignments</h2></div>
                <button className={styles.iconButtonSmall} aria-label="View assignments" onClick={() => router.push("/student/assignments")}><ArrowUpRight size={17} /></button>
              </div>

              <div className={styles.assignmentList}>
                {filteredAssignments.map((assignment) => {
                  const index = assignments.findIndex((item) => item.title === assignment.title);
                  const isDone = completed.includes(index);
                  return (
                    <article key={assignment.title} className={`${styles.assignment} ${isDone ? styles.assignmentDone : ""}`}>
                      <button
                        className={styles.checkButton}
                        onClick={() => setCompleted((old) => isDone ? old.filter((n) => n !== index) : [...old, index])}
                        aria-label={isDone ? "Mark incomplete" : "Mark complete"}
                      >
                        {isDone ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                      </button>
                      <div className={styles.assignmentInfo}>
                        <strong>{assignment.title}</strong>
                        <span>{assignment.course}</span>
                        <small><Clock3 size={12} /> {assignment.due}</small>
                      </div>
                      <span className={`${styles.dueBadge} ${styles[assignment.tone]}`}>{isDone ? "Completed" : assignment.tag}</span>
                    </article>
                  );
                })}
                {filteredAssignments.length === 0 && (
                  <div className={styles.emptyState}>No assignments match your search.</div>
                )}
              </div>
              <button className={styles.panelFooter} onClick={() => router.push("/student/assignments")}>View all assignments <ChevronRight size={16} /></button>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeading}>
                <div><div className={styles.eyebrow}>PLAN YOUR DAY</div><h2>Today&apos;s schedule</h2></div>
                <button className={styles.iconButtonSmall} aria-label="View timetable" onClick={() => router.push("/student/timetable")}><CalendarDays size={17} /></button>
              </div>

              <div className={styles.scheduleList}>
                {schedule.map((item, index) => (
                  <article className={styles.scheduleItem} key={item.code}>
                    <div className={styles.scheduleTime}>
                      <strong>{item.time}</strong><span>{item.end}</span>
                    </div>
                    <div className={`${styles.scheduleMarker} ${styles[`${item.tone}Marker`]}`} />
                    <div className={styles.scheduleInfo}>
                      <strong>{item.name}</strong>
                      <span>{item.code} <span className={styles.separator}>·</span> {item.room}</span>
                    </div>
                    {index === 0 && <span className={styles.liveBadge}>NEXT</span>}
                  </article>
                ))}
              </div>
              <button className={styles.panelFooter}onClick={() => router.push("/student/timetable")}>Open full timetable <ChevronRight size={16} /></button>
            </section>
          </div>

          <footer className={styles.footer}>
            <span>© 2026 UniLearn</span>
            <span>Built for better learning <span className={styles.footerStar}>✦</span></span>
          </footer>
        </div>
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: IconType;
  tone: string;
}) {
  return (
    <article className={styles.statCard}>
      <div className={styles.statTop}>
        <span>{label}</span>
        <div className={`${styles.statIcon} ${styles[tone]}`}><Icon size={18} /></div>
      </div>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statDetail}>{detail}</div>
    </article>
  );
}
