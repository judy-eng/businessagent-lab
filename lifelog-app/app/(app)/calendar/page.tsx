import { Suspense } from "react";
import { calendarRange, endOfMonth, startOfMonth } from "@/lib/dates";
import {
  getEmotionMarks,
  getEmotionTypes,
  getMonthSummary,
  resolveDate,
} from "@/lib/queries";
import { CalendarHeader } from "./calendar-header";
import { DayDetail } from "./day-detail";
import { FilterBar } from "./filter-bar";
import { MonthGrid } from "./month-grid";
import { MonthSummaryPanel } from "./month-summary";
import {
  markMatches,
  parseFilter,
  type CalendarMode,
  type CalendarOpts,
  type CalendarView,
} from "./options";
import { WeekStrip } from "./week-strip";

type SearchParams = Promise<{ date?: string; view?: string; mode?: string; f?: string }>;

async function CalendarContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { date, today, timeZone } = await resolveDate(params.date);
  // 캘린더는 돌아보는 화면이라 월간이 기본이다
  const view: CalendarView = params.view === "week" ? "week" : "month";
  const mode: CalendarMode = params.mode === "heat" ? "heat" : "shapes";
  const filter = parseFilter(params.f);
  const opts: CalendarOpts = { view, date, mode, filter };

  // 보이는 날짜 범위의 감정 기록만 한 번에 가져온다
  const { first, last } = calendarRange(view, date);
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const [marks, types, visibleTypes, summary] = await Promise.all([
    getEmotionMarks(first, last),
    getEmotionTypes({ includeHidden: true }),
    getEmotionTypes(),
    view === "month" ? getMonthSummary(monthStart, monthEnd, today, timeZone) : Promise.resolve(null),
  ]);
  const groupOf = new Map(types.map((t) => [t.id, t.grp]));

  // 필터에 해당하는 날 수 (월간은 그 달의 날짜만)
  let matchedDays: number | null = null;
  if (filter) {
    matchedDays = 0;
    for (const [day, dayMarks] of marks) {
      const inRange = view === "month" ? day >= monthStart && day <= monthEnd : true;
      if (inRange && dayMarks.some((m) => markMatches(m, filter, groupOf))) matchedDays += 1;
    }
  }

  return (
    <>
      <CalendarHeader opts={opts} today={today} />
      <FilterBar opts={opts} types={visibleTypes} matchedDays={matchedDays} />
      {view === "month" ? (
        <MonthGrid opts={opts} today={today} marks={marks} groupOf={groupOf} />
      ) : (
        <WeekStrip opts={opts} today={today} marks={marks} groupOf={groupOf} />
      )}
      {summary && <MonthSummaryPanel date={date} summary={summary} />}
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
