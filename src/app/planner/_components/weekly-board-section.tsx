"use client";

import type { PlannerBoardDay } from "@/lib/exam-plan";

type WeeklyBoardSectionProps = {
  title: string;
  riskMessage: string;
  dayRows: PlannerBoardDay[];
  completionByExamId: Record<string, number>;
  pagesUnitLabel: string;
  minutesUnitLabel: string;
};

export function WeeklyBoardSection({
  title,
  riskMessage,
  dayRows,
  completionByExamId,
  pagesUnitLabel,
  minutesUnitLabel,
}: WeeklyBoardSectionProps) {
  return (
    <section className="planner-panel">
      <h2 className="text-xl font-black text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">{riskMessage}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        {dayRows.map((day) => (
          <article key={day.dateIso} className="planner-card bg-slate-50">
            <p className="planner-eyebrow">{day.label}</p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {day.totalPages} {pagesUnitLabel} - {day.totalMinutes} {minutesUnitLabel}
            </p>
            <ul className="mt-2 space-y-1">
              {day.items.slice(0, 2).map((mission) => (
                <li
                  key={`${day.dateIso}-${mission.examId}`}
                  className="planner-card-soft border-0 bg-white px-2 py-1 text-xs text-slate-700"
                >
                  {mission.subjectName}: {mission.pages}p
                  {typeof completionByExamId[mission.examId] === "number" ? (
                    <span className="ml-1 text-[11px] text-slate-500">
                      ({completionByExamId[mission.examId]}%)
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
