import Link from "next/link";
import { scoreColor, type EmotionGroup } from "@/lib/emotion";
import { WEEKDAY_LABELS_MON_FIRST, addDays, mondayOf } from "@/lib/dates";
import type { DayEmotionMark } from "@/lib/queries";
import { EmotionMarks } from "./emotion-marks";
import { calendarHref, dayAverage, markMatches, type CalendarOpts } from "./options";

// 일주일 보기: 요일 가로 선택줄. 선택한 날은 강조색과 점으로 표시한다.
export function WeekStrip({
  opts,
  today,
  marks,
  groupOf,
}: {
  opts: CalendarOpts;
  today: string;
  marks: Map<string, DayEmotionMark[]>;
  groupOf: Map<number, EmotionGroup>;
}) {
  const { date, mode, filter } = opts;
  const start = mondayOf(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const isMatch = filter ? (m: DayEmotionMark) => markMatches(m, filter, groupOf) : undefined;

  return (
    <div className="mt-5 grid grid-cols-7 gap-1" role="grid" aria-label="주간 달력">
      {days.map((day, i) => {
        const selected = day === date;
        const isToday = day === today;
        const dayMarks = marks.get(day);
        const matched = !!isMatch && !!dayMarks?.some(isMatch);
        const avg = dayAverage(dayMarks);
        const heatStyle =
          mode === "heat" && avg !== null
            ? { backgroundColor: `color-mix(in srgb, ${scoreColor(avg)} 55%, white)` }
            : undefined;
        return (
          <Link
            key={day}
            href={calendarHref(opts, { date: day })}
            role="gridcell"
            aria-label={`${Number(day.slice(5, 7))}월 ${Number(day.slice(8, 10))}일${isToday ? " 오늘" : ""}${matched ? " 선택한 감정 있음" : ""}`}
            aria-current={selected ? "date" : undefined}
            data-match={matched ? "true" : undefined}
            style={heatStyle}
            className={`flex flex-col items-center gap-2 rounded-2xl px-1 py-3 transition hover:brightness-95 ${
              matched ? "ring-2 ring-zinc-900" : ""
            } ${isMatch && !matched ? "opacity-40" : ""}`}
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
              {mode === "heat" ? (
                avg !== null ? (
                  <span className="text-base font-bold text-zinc-800">{Number(avg.toFixed(1))}점</span>
                ) : day <= today ? (
                  <span className="block h-2.5 w-2.5 rounded-full bg-zinc-200" aria-label="기록 없음" />
                ) : null
              ) : (
                <EmotionMarks marks={dayMarks} groupOf={groupOf} showEmptyDot={day <= today} size={12} isMatch={isMatch} />
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
