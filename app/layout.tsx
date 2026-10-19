import "../globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "UniLearn | Teacher Dashboard",
  description: "Your academic workspace, all in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
