
"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import {
  onAuthStateChanged,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import TeacherDashboard from "@/teacher-dashboard";
import { auth, db } from "@/lib/firebase/client";

type AccessState = "checking" | "allowed" | "denied" | "error";

export default function DashboardPage() {
  const router = useRouter();

  const [access, setAccess] = useState<AccessState>("checking");
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    // Validate Firebase before using it.
    if (!auth || !db) {
      setAccess("error");
      return;
    }

    // Capture non-null instances for TypeScript.
    const firebaseAuth = auth;
    const firestore = db;

    let active = true;

    const unsubscribe = onAuthStateChanged(
      firebaseAuth,
      async (user) => {
        if (!active) return;

        if (!user) {
          router.replace("/");
          return;
        }

        setCurrentUser(user);
        setAccess("checking");

        try {
          const profileRef = doc(firestore, "users", user.uid);
          const profile = await getDoc(profileRef);

          if (!active) return;

          const data = profile.data();

          if (
            profile.exists() &&
            data?.role === "teacher" &&
            data?.approved === true
          ) {
            setAccess("allowed");
          } else {
            setAccess("denied");
          }
        } catch (error) {
          console.error("Teacher access verification failed:", error);

          if (active) {
            setAccess("error");
          }
        }
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [router]);

  async function handleSignOut() {
    const firebaseAuth = auth;

    if (!firebaseAuth) {
      router.replace("/");
      return;
    }

    try {
      await signOut(firebaseAuth);
      router.replace("/");
    } catch (error) {
      console.error("Sign-out failed:", error);
    }
  }

  if (access === "checking") {
    return (
      <StatusPage message="Verifying your teacher access..." />
    );
  }

  if (access === "error") {
    return (
      <StatusPage message="We couldn't verify your access. Check your Firebase setup and Firestore rules, then try again." />
    );
  }

  if (access === "denied") {
    return (
      <main style={screenStyle}>
        <section style={messageStyle}>
          <h1>Teacher access not approved</h1>
          <p>
            Your account is signed in, but an administrator has not
            approved it for the teacher portal. Contact your UniLearn
            administrator.
          </p>
          <button style={buttonStyle} onClick={handleSignOut}>
            Sign out
          </button>
        </section>
      </main>
    );
  }

  return (
    <>
      <header style={headerStyle}>
        <strong>UniLearn · Teacher Portal</strong>

        <span style={{ color: "#475569", fontSize: "13px" }}>
          {currentUser?.email}
        </span>

        <button style={buttonStyle} onClick={handleSignOut}>
          Sign out
        </button>
      </header>

      <TeacherDashboard />
    </>
  );
}

function StatusPage({ message }: { message: string }) {
  return (
    <main style={screenStyle}>
      <section style={messageStyle}>
        <p>{message}</p>
      </section>
    </main>
  );
}

const screenStyle: CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: "24px",
  background: "#f8fafc",
  fontFamily: "Arial, Helvetica, sans-serif",
  color: "#172033",
};

const messageStyle: CSSProperties = {
  maxWidth: "480px",
  padding: "32px",
  borderRadius: "18px",
  background: "#fff",
  border: "1px solid #e2e8f0",
  lineHeight: 1.7,
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "14px",
  padding: "14px 24px",
  background: "#1D1D19",
  color: "#F2F0E9",
  borderBottom: "1px solid #34342E",
  fontFamily: "Arial, Helvetica, sans-serif",
};

const buttonStyle: CSSProperties = {
  padding: "10px 14px",
  border: "1px solid #dbe1ea",
  borderRadius: "9px",
  background: "#fff",
  color: "#334155",
  cursor: "pointer",
  fontWeight: 700,
};
