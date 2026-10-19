
"use client";

import { FormEvent, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) router.replace("/dashboard");
    });

    return unsubscribe;
  }, [router]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth) {
      setError("Firebase is not configured. Check your .env.local file.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace("/dashboard");
    } catch (err: unknown) {
	console.error("Firebase login error:", err);
      const code =
        typeof err === "object" && err !== null && "code" in err
          ? String(err.code)
          : "";

      if (code === "auth/invalid-credential" ||
          code === "auth/user-not-found" ||
          code === "auth/wrong-password") {
        setError("Incorrect email or password.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again later.");
      } else {
        setError("Unable to sign in. Check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.logo}>U</div>
        <p style={styles.eyebrow}>UNILEARN · TEACHER PORTAL</p>
        <h1 style={styles.heading}>Welcome back</h1>
        <p style={styles.subtitle}>
          Sign in to manage your classes, courses and timetable.
        </p>

        <form onSubmit={handleLogin} style={styles.form}>
          <label style={styles.label} htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            placeholder="teacher@college.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />

          <label style={styles.label} htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={styles.input}
          />

          {error && <p role="alert" style={styles.error}>{error}</p>}

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "Signing in..." : "Sign in to UniLearn →"}
          </button>
        </form>

        <p style={styles.footer}>
          Access is restricted to administrator-approved teachers.
        </p>
      </section>
      <p style={styles.copyright}>UNILEARN · YOUR CAMPUS, CONNECTED</p>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "28px 18px",
    background:
      "radial-gradient(ellipse at top left, #292B22 0%, #1D1D19 45%, #171715 100%)",
    fontFamily: "Arial, Helvetica, sans-serif",
    color: "#F2F0E9",
  },
  card: {
    width: "100%",
    maxWidth: "430px",
    boxSizing: "border-box",
    padding: "38px",
    border: "1px solid #383A30",
    borderRadius: "20px",
    background: "#24241F",
    boxShadow: "0 24px 70px rgba(0, 0, 0, 0.28)",
  },
  logo: {
    width: "48px",
    height: "48px",
    display: "grid",
    placeItems: "center",
    borderRadius: "15px",
    background: "#B9C69A",
    color: "#24241F",
    fontSize: "25px",
    fontWeight: 800,
  },
  eyebrow: {
    marginTop: "25px",
    color: "#B9C69A",
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "1.8px",
  },
  heading: {
    margin: "10px 0",
    fontSize: "32px",
    letterSpacing: "-1px",
    color: "#F2F0E9",
  },
  subtitle: {
    margin: "0 0 28px",
    color: "#A5A49B",
    fontSize: "14px",
    lineHeight: 1.7,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  label: {
    marginTop: "7px",
    fontSize: "13px",
    fontWeight: 700,
    color: "#E4E1D7",
  },
  input: {
    boxSizing: "border-box",
    width: "100%",
    padding: "13px 14px",
    border: "1px solid #383A30",
    borderRadius: "10px",
    background: "#1B1B18",
    color: "#F2F0E9",
    fontSize: "14px",
    outlineColor: "#B9C69A",
  },
  button: {
    marginTop: "12px",
    padding: "14px",
    border: "none",
    borderRadius: "10px",
    background: "#B9C69A",
    color: "#24241F",
    fontWeight: 700,
    fontSize: "14px",
    cursor: "pointer",
  },
  error: {
    margin: "4px 0",
    color: "#E58C83",
    fontSize: "13px",
    lineHeight: 1.5,
  },
  footer: {
    margin: "24px 0 0",
    paddingTop: "18px",
    borderTop: "1px solid #383A30",
    color: "#A5A49B",
    textAlign: "center",
    fontSize: "11px",
    lineHeight: 1.6,
  },
  copyright: {
    marginTop: "22px",
    color: "#A5A49B",
    fontSize: "10px",
    letterSpacing: "1.5px",
  },
};
