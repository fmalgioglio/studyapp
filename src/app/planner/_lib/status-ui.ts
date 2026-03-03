import type {
  ExamProgressState,
  FocusContributionLevel,
} from "@/app/planner/_lib/season-engine";

export function progressStateClasses(state: ExamProgressState) {
  if (state === "ready") return "bg-emerald-100 text-emerald-900 border-emerald-200";
  if (state === "almost_ready") return "bg-cyan-100 text-cyan-900 border-cyan-200";
  if (state === "steady") return "bg-sky-100 text-sky-900 border-sky-200";
  if (state === "warming_up") return "bg-amber-100 text-amber-900 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export function focusContributionClasses(level: FocusContributionLevel) {
  if (level === "high") return "bg-emerald-100 text-emerald-900 border-emerald-200";
  if (level === "medium") return "bg-sky-100 text-sky-900 border-sky-200";
  if (level === "low") return "bg-amber-100 text-amber-900 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export function urgencyClasses(level: "low" | "medium" | "high") {
  if (level === "low") return "bg-emerald-100 text-emerald-900 border-emerald-200";
  if (level === "medium") return "bg-amber-100 text-amber-900 border-amber-200";
  return "bg-rose-100 text-rose-900 border-rose-200";
}
