import Link from "next/link";
import type { EmotionGroup } from "@/lib/emotion";
import { WEEKDAY_LABELS_MON_FIRST, addDays, mondayOf } from "@/lib/dates";
import type { DayEmotionMark } from "@/lib/queries";
import { calendarHref } from "./calendar-header";
import { EmotionMarks } from "./emotion-marks";

// 일주일 보기: 요일 가로 선택줄. 선택한 날은 강조색과 점으로 표시한다.
export function WeekStrip({
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
  const start = mondayOf(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  return (
    <div className="mt-5 grid grid-cols-7 gap-1" role="grid" aria-label="주간 달력">
      {days.map((day, i) => {
        const selected = day === date;
        const isToday = day === today;
        return (
          <Link
            key={day}
            href={calendarHref("week", day)}
            role="gridcell"
            aria-label={`${Number(day.slice(5, 7))}월 ${Number(day.slice(8, 10))}일${isToday ? " 오늘" : ""}`}
            aria-current={selected ? "date" : undefined}
            className="flex flex-col items-center gap-2 rounded-2xl px-1 py-3 transition hover:bg-zinc-50"
          >
            <span className={`text-xs ${selected ? "font-semibold text-sky-600" : "text-zinc-400"}`}>
              {WEEKDAY_LABELS_MON_FIRST[i]}
            </span>
            <span
              className={`text-xl ${
                selected ? "font-bold text-sky-600" : isToday ? "font-extrabold text-zinc-900" : "text-zinc-700"
              }`}
            >
              {Number(day.slice(8, 10))}
            </span>
            <span className={`h-1.5 w-1.5 rounded-full ${selected ? "bg-sky-500" : "bg-transparent"}`} />
            <div className="flex min-h-[44px] items-start">
              <EmotionMarks
                marks={marks.get(day)}
                groupOf={groupOf}
                showEmptyDot={day <= today}
                size={12}
              />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
