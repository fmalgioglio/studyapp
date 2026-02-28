import Link from "next/link";
import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME, verifySessionToken } from "@/server/auth/session";
import { LogoutButton } from "./_components/logout-button";

const plannerLinks = [
  { href: "/planner/students", label: "Profile" },
  { href: "/planner", label: "Season" },
  { href: "/planner/focus", label: "Focus Arena" },
  { href: "/planner/subjects", label: "Subject Hub" },
  { href: "/planner/exams", label: "Exams" },
  { href: "/planner/estimate", label: "Quick Estimate" },
] as const;

export default async function PlannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;

  if (!session) {
    return (
      <div className="min-h-[calc(100vh-73px)] bg-[linear-gradient(180deg,#f8fbff_0%,#eef2ff_100%)]">
        <div className="mx-auto flex w-full max-w-xl items-center justify-center px-4 py-12 sm:px-6">
          <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Session required
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Your session is missing or expired. Sign in to access the planner.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Link
                href="/login"
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Go to login
              </Link>
              <Link
                href="/signup"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Create account
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-73px)] bg-[radial-gradient(circle_at_top_left,#dbeafe_0%,#f0f9ff_38%,#eef2ff_100%)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
          <nav className="flex flex-wrap gap-2">
            {plannerLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <LogoutButton />
        </div>
        {children}
      </div>
    </div>
  );
}
