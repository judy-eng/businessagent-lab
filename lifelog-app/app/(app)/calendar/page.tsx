import { Suspense } from "react";
import {
  addDays,
  mondayOf,
  monthGrid,
} from "@/lib/dates";
import {
  getEmotionMarks,
  getEmotionTypes,
  resolveDate,
} from "@/lib/queries";
import { CalendarHeader, type CalendarView } from "./calendar-header";
import { DayDetail } from "./day-detail";
import { MonthGrid } from "./month-grid";
import { WeekStrip } from "./week-strip";

type SearchParams = Promise<{ date?: string; view?: string }>;

async function CalendarContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { date, today, timeZone } = await resolveDate(params.date);
  const view: CalendarView = params.view === "week" ? "week" : "month";

  // 보이는 날짜 범위의 감정 기록만 한 번에 가져온다
  let first: string;
  let last: string;
  if (view === "month") {
    const weeks = monthGrid(date);
    first = weeks[0][0];
    last = weeks[weeks.length - 1][6];
  } else {
    first = mondayOf(date);
    last = addDays(first, 6);
  }
  const [marks, types] = await Promise.all([
    getEmotionMarks(first, last),
    getEmotionTypes({ includeHidden: true }),
  ]);
  const groupOf = new Map(types.map((t) => [t.id, t.grp]));

  return (
    <>
      <CalendarHeader view={view} date={date} today={today} />
      {view === "month" ? (
        <MonthGrid date={date} today={today} marks={marks} groupOf={groupOf} />
      ) : (
        <WeekStrip date={date} today={today} marks={marks} groupOf={groupOf} />
      )}
      <Suspense fallback={<p className="mt-10 text-center text-zinc-400">불러오는 중...</p>}>
        <DayDetail date={date} timeZone={timeZone} types={types} />
      </Suspense>
    </>
  );
}

export default function CalendarPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<p className="mt-10 text-center text-zinc-400">불러오는 중...</p>}>
      <CalendarContent searchParams={searchParams} />
    </Suspense>
  );
}
