
"use client";

import { FormEvent, useState } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Mail,
  LockKeyhole,
  ArrowRight,
  BookOpen,
  ShieldCheck,
} from "lucide-react";
import { auth, db } from "@/lib/firebase/client";

export default function StudentLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!auth || !db) {
      setError("Firebase is not configured. Please check your setup.");
      return;
    }

    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      const profileRef = doc(db, "users", credential.user.uid);
      const profile = await getDoc(profileRef);
      const data = profile.data();

      if (
        profile.exists() &&
        data?.role === "student" &&
        data?.approved === true
      ) {
        router.replace("/student");
      } else {
        await signOut(auth);
        setError(
          "Student access is not approved for this account. Contact your administrator."
        );
      }
    } catch (err: unknown) {
      const code =
        typeof err === "object" && err !== null && "code" in err
          ? String(err.code)
          : "";

      console.error("Student login error:", err);

      if (
        code === "auth/invalid-credential" ||
        code === "auth/user-not-found" ||
        code === "auth/wrong-password"
      ) {
        setError("Incorrect email or password.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again later.");
      } else if (code === "auth/network-request-failed") {
        setError("Network error. Check your internet connection.");
      } else {
        setError("Unable to sign in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={s.page}>
      <div style={s.glowOne} />
      <div style={s.glowTwo} />

      <header style={s.header}>
        <div style={s.brandIcon}>
          <GraduationCap size={25} />
        </div>
        <div>
          <div style={s.brandName}>UniLearn</div>
          <div style={s.brandCaption}>STUDENT PORTAL</div>
        </div>
      </header>

      <section style={s.card}>
        <div style={s.welcomeIcon}>
          <BookOpen size={24} />
        </div>

        <div style={s.eyebrow}>YOUR LEARNING JOURNEY</div>
        <h1 style={s.heading}>Welcome back.</h1>
        <p style={s.subtitle}>
          Sign in to explore your courses, track assignments, and stay on top
          of your classes.
        </p>

        <form onSubmit={handleLogin} style={s.form}>
          <label htmlFor="student-email" style={s.label}>
            College email
          </label>
          <div style={s.inputWrap}>
            <Mail size={18} style={s.inputIcon} />
            <input
              id="student-email"
              type="email"
              autoComplete="username"
              placeholder="you@college.edu"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              style={s.input}
            />
          </div>

          <label htmlFor="student-password" style={s.label}>
            Password
          </label>
          <div style={s.inputWrap}>
            <LockKeyhole size={18} style={s.inputIcon} />
            <input
              id="student-password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              style={s.input}
            />
          </div>

          {error && (
            <div role="alert" style={s.error}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={s.button}>
            <span>{loading ? "Signing in..." : "Sign in to UniLearn"}</span>
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div style={s.securityNote}>
          <ShieldCheck size={17} />
          <span>Secure access for approved student accounts</span>
        </div>
      </section>

      <footer style={s.footer}>
        <span>© 2026 UniLearn</span>
        <span>Learn something extraordinary.</span>
      </footer>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    position: "relative",
    isolation: "isolate",
    minHeight: "100vh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "35px 20px",
    background: "#080d19",
    color: "#edf1ff",
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  glowOne: {
    position: "absolute",
    zIndex: -1,
    width: "460px",
    height: "460px",
    top: "-230px",
    left: "-140px",
    borderRadius: "50%",
    background: "#5d4dd4",
    opacity: 0.15,
    filter: "blur(110px)",
  },
  glowTwo: {
    position: "absolute",
    zIndex: -1,
    width: "430px",
    height: "430px",
    bottom: "-260px",
    right: "-100px",
    borderRadius: "50%",
    background: "#247ac7",
    opacity: 0.12,
    filter: "blur(110px)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "30px",
  },
  brandIcon: {
    width: "48px",
    height: "48px",
    display: "grid",
    placeItems: "center",
    borderRadius: "15px",
    background: "linear-gradient(140deg, #8a7bff, #5140c4)",
    color: "#fff",
    boxShadow: "0 8px 30px #6252df40",
  },
  brandName: {
    fontSize: "22px",
    fontWeight: 800,
    letterSpacing: "-0.7px",
  },
  brandCaption: {
    marginTop: "4px",
    color: "#8998b3",
    fontSize: "9px",
    fontWeight: 800,
    letterSpacing: "2px",
  },
  card: {
    width: "100%",
    maxWidth: "440px",
    padding: "36px",
    boxSizing: "border-box",
    border: "1px solid #27334a",
    borderRadius: "22px",
    background: "linear-gradient(145deg, #151e30, #101725)",
    boxShadow: "0 28px 90px #00000050",
  },
  welcomeIcon: {
    display: "grid",
    placeItems: "center",
    width: "49px",
    height: "49px",
    marginBottom: "25px",
    border: "1px solid #7766db50",
    borderRadius: "15px",
    background: "#7766db20",
    color: "#b4a9ff",
  },
  eyebrow: {
    color: "#a79aff",
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "1.7px",
  },
  heading: {
    margin: "12px 0 10px",
    fontSize: "34px",
    letterSpacing: "-1.5px",
    lineHeight: 1.2,
  },
  subtitle: {
    margin: "0 0 27px",
    color: "#98a6bd",
    fontSize: "13px",
    lineHeight: 1.8,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  label: {
    marginTop: "5px",
    color: "#dce4f5",
    fontSize: "12px",
    fontWeight: 700,
  },
  inputWrap: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
    padding: "0 13px",
    border: "1px solid #334057",
    borderRadius: "11px",
    background: "#0b1220",
  },
  inputIcon: {
    flexShrink: 0,
    color: "#8291ad",
  },
  input: {
    width: "100%",
    minWidth: 0,
    padding: "14px 0",
    border: "none",
    outline: "none",
    color: "#f1f5ff",
    background: "transparent",
    fontSize: "13px",
  },
  error: {
    padding: "11px 12px",
    border: "1px solid #f8717138",
    borderRadius: "9px",
    background: "#ef444415",
    color: "#fca5a5",
    fontSize: "12px",
    lineHeight: 1.6,
  },
  button: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    width: "100%",
    marginTop: "12px",
    padding: "14px 16px",
    border: "1px solid #9587ff",
    borderRadius: "11px",
    background: "linear-gradient(100deg, #7866ed, #5c4bc6)",
    color: "#fff",
    fontSize: "13px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 8px 24px #6454d52a",
  },
  securityNote: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    marginTop: "25px",
    paddingTop: "20px",
    borderTop: "1px solid #29354a",
    color: "#8f9db5",
    fontSize: "10px",
  },
  footer: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "10px 24px",
    marginTop: "25px",
    color: "#75839d",
    fontSize: "10px",
  },
};
