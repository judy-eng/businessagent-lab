import Link from "next/link";
import type { EmotionGroup } from "@/lib/emotion";
import { WEEKDAY_LABELS_MON_FIRST, addDays, mondayOf } from "@/lib/dates";
import type { DayEmotionMark } from "@/lib/queries";
import { EmotionMarks } from "../calendar/emotion-marks";

// 홈의 '이번 주' 한 줄 띠. 오늘을 눈에 띄게 보여주고, 날짜를 누르면 캘린더에서 그날을 본다.
// (월간 보기와 전환은 캘린더 탭에서 한다)
export function WeekBand({
  today,
  marks,
  groupOf,
}: {
  today: string;
  marks: Map<string, DayEmotionMark[]>;
  groupOf: Map<number, EmotionGroup>;
}) {
  const start = mondayOf(today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  return (
    <section aria-label="이번 주">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-700">이번 주</h2>
        <Link href="/calendar" className="text-xs text-zinc-500 underline underline-offset-2">
          캘린더 열기
        </Link>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const isToday = day === today;
          return (
            <Link
              key={day}
              href={`/calendar?date=${day}`}
              aria-label={`${Number(day.slice(5, 7))}월 ${Number(day.slice(8, 10))}일${isToday ? " 오늘" : ""}`}
              className={`flex flex-col items-center gap-1 rounded-2xl py-2 transition hover:bg-zinc-50 ${
                isToday ? "bg-zinc-900 text-white hover:bg-zinc-900" : ""
              }`}
            >
              <span className={`text-[11px] ${isToday ? "text-zinc-300" : "text-zinc-400"}`}>
                {WEEKDAY_LABELS_MON_FIRST[i]}
              </span>
              <span className="text-base font-semibold">{Number(day.slice(8, 10))}</span>
              <span className="flex h-3 items-center">
                <EmotionMarks marks={marks.get(day)} groupOf={groupOf} showEmptyDot={false} size={9} />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
