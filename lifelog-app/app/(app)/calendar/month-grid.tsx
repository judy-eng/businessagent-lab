import Link from "next/link";
import { scoreColor, type EmotionGroup } from "@/lib/emotion";
import { WEEKDAY_LABELS_MON_FIRST, monthGrid } from "@/lib/dates";
import type { DayEmotionMark } from "@/lib/queries";
import { EmotionMarks } from "./emotion-marks";
import { calendarHref, dayAverage, markMatches, type CalendarOpts } from "./options";

// 돌아보기용 월간 달력: 칸이 크고, 도형 또는 점수색으로 보고, 감정 필터로 날짜를 강조한다.
export function MonthGrid({
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
  const weeks = monthGrid(date);
  const month = date.slice(0, 7);
  const isMatch = filter ? (m: DayEmotionMark) => markMatches(m, filter, groupOf) : undefined;

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
                className={`flex min-h-[104px] flex-col items-center gap-2 border-zinc-200 px-0.5 py-2.5 transition hover:brightness-95 ${
                  col > 0 ? "border-l" : ""
                } ${selected ? "ring-2 ring-inset ring-violet-400" : ""} ${
                  matched ? "ring-2 ring-inset ring-zinc-900" : ""
                } ${inMonth ? "" : "opacity-40"} ${isMatch && !matched ? "opacity-40" : ""}`}
              >
                <span
                  className={`text-sm ${
                    isToday ? "font-extrabold text-zinc-900 underline decoration-2 underline-offset-4" : "text-zinc-600"
                  }`}
                >
                  {Number(day.slice(8, 10))}
                </span>
                {mode === "heat" ? (
                  avg !== null ? (
                    <span className="text-base font-bold text-zinc-800">
                      {Number(avg.toFixed(1))}
                      <span className="ml-0.5 text-[10px] font-normal text-zinc-600">점</span>
                    </span>
                  ) : day <= today ? (
                    <span className="block h-2.5 w-2.5 rounded-full bg-zinc-200" aria-label="기록 없음" />
                  ) : null
                ) : (
                  <EmotionMarks
                    marks={dayMarks}
                    groupOf={groupOf}
                    showEmptyDot={day <= today}
                    size={13}
                    isMatch={isMatch}
                  />
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}
