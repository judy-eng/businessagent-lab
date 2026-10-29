import Link from "next/link";
import type { EmotionGroup } from "@/lib/emotion";
import { WEEKDAY_LABELS_MON_FIRST, monthGrid } from "@/lib/dates";
import type { DayEmotionMark } from "@/lib/queries";
import { calendarHref } from "./calendar-header";
import { EmotionMarks } from "./emotion-marks";

export function MonthGrid({
  date,
  today,
  marks,
  groupOf,
}: {
  date: string;
  today: string;
  marks: Map<string, DayEmotionMark[]>;
  groupOf: Map<number, EmotionGroup>;
}) {
  const weeks = monthGrid(date);
  const month = date.slice(0, 7);

  return (
    <div className="mt-4" role="grid" aria-label="월간 달력">
      <div className="grid grid-cols-7 text-center text-xs text-zinc-400" role="row">
        {WEEKDAY_LABELS_MON_FIRST.map((label) => (
          <div key={label} className="py-2" role="columnheader">
            {label}
          </div>
        ))}
      </div>
      {weeks.map((week) => (
        <div key={week[0]} className="grid grid-cols-7" role="row">
          {week.map((day, col) => {
            const inMonth = day.startsWith(month);
            const isToday = day === today;
            const selected = day === date;
            return (
              <Link
                key={day}
                href={calendarHref("month", day)}
                role="gridcell"
                aria-label={`${Number(day.slice(5, 7))}월 ${Number(day.slice(8, 10))}일${isToday ? " 오늘" : ""}`}
                aria-current={selected ? "date" : undefined}
                className={`flex min-h-[76px] flex-col items-center gap-1.5 border-zinc-200 px-0.5 py-2 transition hover:bg-zinc-50 ${
                  col > 0 ? "border-l" : ""
                } ${selected ? "bg-violet-50 ring-1 ring-inset ring-violet-300" : ""} ${
                  inMonth ? "" : "opacity-40"
                }`}
              >
                <span
                  className={`text-sm ${
                    isToday ? "font-extrabold text-zinc-900 underline decoration-2 underline-offset-4" : "text-zinc-600"
                  }`}
                >
                  {Number(day.slice(8, 10))}
                </span>
                <EmotionMarks
                  marks={marks.get(day)}
                  groupOf={groupOf}
                  showEmptyDot={day <= today}
                />
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}
