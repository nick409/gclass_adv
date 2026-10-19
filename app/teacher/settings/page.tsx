"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, sendPasswordResetEmail, updateProfile, type User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Bell, Check, ChevronRight, Laptop, LoaderCircle,
  LockKeyhole, LogOut, Moon, Save, ShieldCheck, Sun, UserRound, Palette,
} from "lucide-react";

type Preferences = {
  emailAssignments: boolean;
  emailMessages: boolean;
  emailGradeUpdates: boolean;
  emailAnnouncements: boolean;
};

const defaultPreferences: Preferences = {
  emailAssignments: true,
  emailMessages: true,
  emailGradeUpdates: true,
  emailAnnouncements: false,
};

const fieldStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", border: "1px solid var(--settings-border)",
  background: "var(--settings-input)", color: "var(--settings-text)", borderRadius: 10,
  padding: "12px 13px", outline: "none", font: "inherit",
};

export default function TeacherSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [theme, setTheme] = useState<"dark" | "light" | "system">("dark");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("gclass-teacher-theme");
    if (storedTheme === "dark" || storedTheme === "light" || storedTheme === "system") {
      setTheme(storedTheme);
    }
    const unsubscribe = auth ? onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
        router.replace("/");
        return;
      }
      if (!db) {
        setError("Firebase is not configured.");
        setLoading(false);
        return;
      }
      try {
        const snapshot = await getDoc(doc(db, "users", currentUser.uid));
        if (!snapshot.exists() || snapshot.data().role !== "teacher" || snapshot.data().approved !== true) {
          setError("Your account is not approved for the teacher portal.");
          setLoading(false);
          return;
        }
        const profile = snapshot.data();
        setDisplayName(String(profile.displayName || currentUser.displayName || ""));
        setDepartment(String(profile.department || ""));
        setPhone(String(profile.phone || ""));
        setPreferences({ ...defaultPreferences, ...(profile.preferences || {}) });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load your settings.");
      } finally {
        setLoading(false);
      }
    }) : undefined;
    if (!auth) {
      setError("Firebase is not configured.");
      setLoading(false);
    }
    return () => unsubscribe?.();
  }, [router]);

  function applyTheme(nextTheme: "dark" | "light" | "system") {
    setTheme(nextTheme);
    window.localStorage.setItem("gclass-teacher-theme", nextTheme);
    const resolved = nextTheme === "system"
      ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
      : nextTheme;
    document.documentElement.dataset.teacherTheme = resolved;
  }

  async function saveSettings() {
    setMessage(""); setError("");
    if (!user || !db) { setError("You must be signed in and connected to Firebase to save settings."); return; }
    if (!displayName.trim()) { setError("Please enter your name."); return; }
    setSaving(true);
    try {
      await setDoc(doc(db, "users", user.uid), {
        displayName: displayName.trim(),
        department: department.trim(),
        phone: phone.trim(),
        preferences,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      if (displayName.trim() !== (user.displayName || "")) {
        await updateProfile(user, { displayName: displayName.trim() });
      }
      setMessage("Settings saved successfully.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save settings. Check your Firestore rules.");
    } finally {
      setSaving(false);
    }
  }

  async function sendResetEmail() {
    setMessage(""); setError("");
    if (!auth || !user?.email) { setError("No email address is available for this account."); return; }
    setSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      setMessage(`Password reset link sent to ${user.email}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the password reset email.");
    } finally {
      setSendingReset(false);
    }
  }

  const dark = theme !== "light";
  const pageStyle: React.CSSProperties = {
    minHeight: "100vh", background: dark ? "#171715" : "#f5f5f0",
    color: dark ? "#f2f0e9" : "#24241f", padding: "28px clamp(16px, 4vw, 48px) 48px",
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    transition: "background .2s ease, color .2s ease",
    // Keep this route self-contained while still allowing a theme preference to be saved.
    ["--settings-border" as string]: dark ? "#3a3a34" : "#deded5",
    ["--settings-input" as string]: dark ? "#20201c" : "#ffffff",
    ["--settings-text" as string]: dark ? "#f2f0e9" : "#24241f",
  };
  const panel: React.CSSProperties = { background: dark ? "#20201c" : "#ffffff", border: `1px solid ${dark ? "#34342e" : "#e3e3da"}`, borderRadius: 16, padding: "22px", marginBottom: 18 };
  const muted: React.CSSProperties = { color: dark ? "#aaa99f" : "#6d6d63", fontSize: 13, lineHeight: 1.55 };
  const label: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 650, marginBottom: 7 };
  const secondaryButton: React.CSSProperties = { border: `1px solid ${dark ? "#45453c" : "#d8d8ce"}`, background: "transparent", color: "inherit", borderRadius: 10, padding: "10px 13px", fontWeight: 650, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 };

  if (loading) return <main style={pageStyle}><div style={{ maxWidth: 900, margin: "70px auto", display: "flex", alignItems: "center", gap: 10 }}><LoaderCircle size={19} /> Loading teacher settings…</div></main>;

  return (
    <main style={pageStyle}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <button onClick={() => router.push("/dashboard")} style={{ ...secondaryButton, marginBottom: 22 }}><ArrowLeft size={16} /> Back to dashboard</button>
        <div style={{ marginBottom: 26 }}>
          <div style={{ color: "#b9c69a", fontSize: 11, fontWeight: 800, letterSpacing: 1.7, marginBottom: 8 }}>TEACHER WORKSPACE</div>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 36px)", margin: "0 0 8px", letterSpacing: -1.1 }}>Settings</h1>
          <p style={{ ...muted, margin: 0 }}>Manage your faculty profile, notifications, appearance and account security.</p>
        </div>

        {error && <div role="alert" style={{ padding: 13, borderRadius: 10, border: "1px solid #9b5c52", background: dark ? "#39221f" : "#fff0ed", color: dark ? "#ffd5cd" : "#8a3026", marginBottom: 16 }}>{error}</div>}
        {message && <div role="status" style={{ padding: 13, borderRadius: 10, border: "1px solid #65764d", background: dark ? "#293021" : "#eff5e6", color: dark ? "#dbe8c8" : "#344522", marginBottom: 16, display: "flex", gap: 9, alignItems: "center" }}><Check size={17} />{message}</div>}

        <section style={panel}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20 }}><div style={{ width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", background: dark ? "#34362b" : "#edf0e5", color: dark ? "#c8d5a8" : "#52613b" }}><UserRound size={20} /></div><div><h2 style={{ fontSize: 17, margin: "0 0 4px" }}>Faculty profile</h2><p style={{ ...muted, margin: 0 }}>This information is associated with your teacher account.</p></div></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 16 }}>
            <div><label style={label} htmlFor="teacher-name">Display name</label><input id="teacher-name" style={fieldStyle} value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your full name" /></div>
            <div><label style={label} htmlFor="teacher-email">Account email</label><input id="teacher-email" style={{ ...fieldStyle, opacity: .7 }} value={user?.email || ""} readOnly /><p style={{ ...muted, margin: "6px 0 0" }}>Email changes are managed through account verification.</p></div>
            <div><label style={label} htmlFor="teacher-department">Department</label><input id="teacher-department" style={fieldStyle} value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Computer Science" /></div>
            <div><label style={label} htmlFor="teacher-phone">Contact number (optional)</label><input id="teacher-phone" style={fieldStyle} value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" /></div>
          </div>
        </section>

        <section style={panel}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 18 }}><div style={{ width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", background: dark ? "#34362b" : "#edf0e5", color: dark ? "#c8d5a8" : "#52613b" }}><Palette size={20} /></div><div><h2 style={{ fontSize: 17, margin: "0 0 4px" }}>Appearance</h2><p style={{ ...muted, margin: 0 }}>Choose how the settings page is displayed.</p></div></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            {([ ["light", "Light", Sun], ["dark", "Dark", Moon], ["system", "System", Laptop] ] as const).map(([value, title, Icon]) => <button key={value} onClick={() => applyTheme(value)} aria-pressed={theme === value} style={{ textAlign: "left", borderRadius: 12, border: `1px solid ${theme === value ? "#b9c69a" : (dark ? "#3a3a34" : "#deded5")}`, background: theme === value ? (dark ? "#303627" : "#f0f4e7") : "transparent", color: "inherit", padding: 14, cursor: "pointer" }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 15 }}><Icon size={19} />{theme === value && <Check size={16} color={dark ? "#c8d5a8" : "#52613b"} />}</div><strong style={{ display: "block", fontSize: 14 }}>{title}</strong><span style={muted}>{value === "system" ? "Follow device preference" : `${title} appearance`}</span></button>)}
          </div>
          <p style={{ ...muted, margin: "12px 0 0" }}>Your selection is saved on this device. The settings screen applies it immediately; other pages need theme-aware styles to change globally.</p>
        </section>

        <section style={panel}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 18 }}><div style={{ width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", background: dark ? "#34362b" : "#edf0e5", color: dark ? "#c8d5a8" : "#52613b" }}><Bell size={20} /></div><div><h2 style={{ fontSize: 17, margin: "0 0 4px" }}>Email notifications</h2><p style={{ ...muted, margin: 0 }}>Choose which activity updates you want to receive.</p></div></div>
          {([ ["emailAssignments", "Assignment submissions", "When students submit or update their work."], ["emailMessages", "Student messages", "When a student sends you a message."], ["emailGradeUpdates", "Grade updates", "When grades or results need your attention."], ["emailAnnouncements", "Course announcements", "Reminders about course announcements." ] ] as const).map(([key, title, description]) => <label key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, padding: "13px 0", borderTop: `1px solid ${dark ? "#34342e" : "#ededE5"}`, cursor: "pointer" }}><span><strong style={{ display: "block", fontSize: 14, marginBottom: 4 }}>{title}</strong><span style={muted}>{description}</span></span><input type="checkbox" checked={preferences[key]} onChange={e => setPreferences(old => ({ ...old, [key]: e.target.checked }))} style={{ width: 18, height: 18, accentColor: "#b9c69a", flexShrink: 0 }} /></label>)}
          <p style={{ ...muted, margin: "10px 0 0" }}>These preferences are stored in your profile. Actual email delivery requires a notification service to be configured.</p>
        </section>

        <section style={panel}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 17 }}><div style={{ width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", background: dark ? "#34362b" : "#edf0e5", color: dark ? "#c8d5a8" : "#52613b" }}><ShieldCheck size={20} /></div><div><h2 style={{ fontSize: 17, margin: "0 0 4px" }}>Account security</h2><p style={{ ...muted, margin: 0 }}>Manage access to your account.</p></div></div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}><div><strong style={{ display: "block", fontSize: 14, marginBottom: 4 }}>Reset password</strong><p style={{ ...muted, margin: 0 }}>Send a password reset link to your account email.</p></div><button style={secondaryButton} onClick={sendResetEmail} disabled={sendingReset}>{sendingReset ? <LoaderCircle size={16} /> : <LockKeyhole size={16} />}{sendingReset ? "Sending…" : "Send reset link"}<ChevronRight size={15} /></button></div>
          <div style={{ borderTop: `1px solid ${dark ? "#34342e" : "#ededE5"}`, marginTop: 18, paddingTop: 17, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}><div><strong style={{ display: "block", fontSize: 14, marginBottom: 4 }}>Sign out</strong><p style={{ ...muted, margin: 0 }}>End this session on the current device.</p></div><button style={secondaryButton} onClick={async () => {
  if (!auth) {
    router.replace("/");
    return;
  }

  try {
    const { signOut } = await import("firebase/auth");
    await signOut(auth);
    router.replace("/");
  } catch (error) {
    console.error("Sign out failed:", error);
    setError("Unable to sign out. Please try again.");
  }
}}><LogOut size={16} /> Sign out</button></div>
        </section>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}><button style={secondaryButton} onClick={() => router.push("/dashboard")}>Cancel</button><button onClick={saveSettings} disabled={saving} style={{ border: 0, borderRadius: 10, padding: "12px 17px", background: "#b9c69a", color: "#22251c", fontWeight: 800, cursor: saving ? "wait" : "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>{saving ? <LoaderCircle size={16} /> : <Save size={16} />}{saving ? "Saving…" : "Save settings"}</button></div>
      </div>
    </main>
  );
}
