import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UniLearn — Teacher Dashboard",
  description: "Academic workspace for teachers and faculty.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
