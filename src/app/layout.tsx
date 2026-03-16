import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";

import { SiteNav } from "@/app/_components/site-nav";
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
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="flex min-h-screen flex-col">
          <header className="site-header sticky top-0 z-40">
            <div className="site-header-inner">
              <Link href="/" className="site-brand">
                <span className="site-brand-dot" aria-hidden />
                StudyApp
              </Link>
              <SiteNav />
            </div>
          </header>
          <div className="flex-1">
            {children}
          </div>
          <footer className="border-t border-slate-200/80 bg-white/85">
            <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-sm text-slate-600 sm:px-6">
              <p>StudyApp 2026</p>
              <div className="flex flex-wrap items-center gap-4 font-semibold text-slate-700">
                <Link href="/privacy">Privacy</Link>
                <Link href="/terms">Terms</Link>
                <Link href="/cookies">Cookies</Link>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
