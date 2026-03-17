import Link from "next/link";
import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME, verifySessionToken } from "@/server/auth/session";
import { PlannerTabsNav } from "./_components/planner-tabs-nav";
import { LogoutButton } from "./_components/logout-button";

const plannerLinks = [
  { href: "/planner", label: "Planner" },
  { href: "/planner/focus", label: "Study Today" },
  { href: "/planner/subjects", label: "Subjects" },
  { href: "/planner/exams", label: "Targets" },
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
      <div className="min-h-[calc(100vh-73px)]">
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
    <div className="min-h-[calc(100vh-73px)]">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <div className="planner-panel planner-shell mb-4 bg-white/90">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <PlannerTabsNav links={plannerLinks} />
            <div className="flex items-center gap-2">
              <Link
                href="/planner/students"
                className="planner-btn planner-btn-secondary min-h-0 px-3 py-2"
              >
                Profile
              </Link>
              <LogoutButton />
            </div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
