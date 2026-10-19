
"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  Check,
  Monitor,
  Moon,
  Sun,
  UserRound,
  GraduationCap,
  ShieldCheck,
  Palette,
} from "lucide-react";
import styles from "./settings.module.css";

type Theme = "dark" | "light" | "system";

export default function StudentSettingsPage() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [assignmentAlerts, setAssignmentAlerts] = useState(true);
  const [teacherReplies, setTeacherReplies] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem("gclass-theme") as Theme | null;
    const storedEmail = localStorage.getItem("gclass-email-alerts");
    const storedAssignments = localStorage.getItem("gclass-assignment-alerts");
    const storedReplies = localStorage.getItem("gclass-teacher-replies");

    if (storedTheme) setTheme(storedTheme);
    if (storedEmail !== null) setEmailAlerts(storedEmail === "true");
    if (storedAssignments !== null)
      setAssignmentAlerts(storedAssignments === "true");
    if (storedReplies !== null)
      setTeacherReplies(storedReplies === "true");
  }, []);

  useEffect(() => {
    const applyTheme = () => {
      const isLight =
        theme === "light" ||
        (theme === "system" &&
          window.matchMedia("(prefers-color-scheme: light)").matches);

      document.documentElement.dataset.theme = isLight ? "light" : "dark";
      localStorage.setItem("gclass-theme", theme);
    };

    applyTheme();

    if (theme !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: light)");
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [theme]);

  function savePreferences() {
    localStorage.setItem("gclass-email-alerts", String(emailAlerts));
    localStorage.setItem(
      "gclass-assignment-alerts",
      String(assignmentAlerts)
    );
    localStorage.setItem("gclass-teacher-replies", String(teacherReplies));
    setSaved(true);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>YOUR ACCOUNT</p>
          <h1>Settings</h1>
          <p className={styles.subtitle}>
            Personalise your G Class Advance experience.
          </p>
        </div>
        <div className={styles.headerIcon}>
          <Palette size={25} />
        </div>
      </header>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>
          <div className={styles.sectionIcon}><Sun size={19} /></div>
          <div>
            <h2>Appearance</h2>
            <p>Choose how G Class Advance looks on your device.</p>
          </div>
        </div>

        <div className={styles.themeGrid}>
          {([
            { id: "light", label: "Light mode", Icon: Sun },
            { id: "dark", label: "Dark mode", Icon: Moon },
            { id: "system", label: "System default", Icon: Monitor },
          ] as const).map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={`${styles.themeOption} ${
                theme === id ? styles.selected : ""
              }`}
              onClick={() => setTheme(id)}
              aria-pressed={theme === id}
            >
              <Icon size={21} />
              <span>{label}</span>
              {theme === id && <Check size={17} />}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>
          <div className={styles.sectionIcon}><Bell size={19} /></div>
          <div>
            <h2>Notifications</h2>
            <p>Choose which updates you want to receive.</p>
          </div>
        </div>

        <SettingRow
          title="Email notifications"
          description="Receive important academic updates by email."
          checked={emailAlerts}
          onChange={setEmailAlerts}
        />
        <SettingRow
          title="Assignment reminders"
          description="Get reminders about upcoming deadlines."
          checked={assignmentAlerts}
          onChange={setAssignmentAlerts}
        />
        <SettingRow
          title="Teacher replies"
          description="Know when a teacher responds to your query."
          checked={teacherReplies}
          onChange={setTeacherReplies}
        />
      </section>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>
          <div className={styles.sectionIcon}><UserRound size={19} /></div>
          <div>
            <h2>Account & academics</h2>
            <p>Manage your student account and learning preferences.</p>
          </div>
        </div>

        <div className={styles.infoRow}>
          <UserRound size={19} />
          <div>
            <strong>Student profile</strong>
            <p>Your name and email are managed by your account.</p>
          </div>
          <span className={styles.status}>Account</span>
        </div>
        <div className={styles.infoRow}>
          <GraduationCap size={19} />
          <div>
            <strong>Academic preferences</strong>
            <p>Semester, enrolled courses, and timetable preferences.</p>
          </div>
          <span className={styles.status}>Student</span>
        </div>
        <div className={styles.infoRow}>
          <ShieldCheck size={19} />
          <div>
            <strong>Security</strong>
            <p>Your account is protected by Firebase Authentication.</p>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>{saved ? "Your preferences have been saved." : "Changes to notification preferences need to be saved."}</p>
        <button className={styles.saveButton} onClick={savePreferences}>
          {saved ? <Check size={17} /> : null}
          {saved ? "Saved" : "Save preferences"}
        </button>
      </footer>
    </main>
  );
}

function SettingRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className={styles.settingRow}>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        className={`${styles.switch} ${checked ? styles.switchOn : ""}`}
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
    </div>
  );
}
