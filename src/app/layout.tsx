import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import Link from "next/link";

import { SiteNav } from "@/app/_components/site-nav";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/server/auth/session";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StudyApp",
  description: "Gamified study planning for students",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="min-h-screen">
          <header className="site-header sticky top-0 z-40">
            <div className="site-header-inner">
              <Link href="/" className="site-brand">
                <span className="site-brand-dot" aria-hidden />
                StudyApp
              </Link>
              <SiteNav isAuthenticated={Boolean(session)} />
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
