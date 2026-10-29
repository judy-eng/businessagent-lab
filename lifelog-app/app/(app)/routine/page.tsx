import Link from "next/link";
import { Suspense } from "react";
import { DateNav } from "@/components/date-nav";
import {
  getCategories,
  getRoutineChecklist,
  getRoutines,
  resolveDate,
} from "@/lib/queries";
import { CategoryFilter } from "./category-filter";
import { HabitTracker } from "./habit-tracker";
import { matchesCategory, parseCategoryFilter, routineHref, type RoutineParams } from "./options";
import { RoutineChecklist } from "./routine-checklist";
import { RoutineManager } from "./routine-manager";

type SearchParams = Promise<{
  date?: string;
  view?: string;
  month?: string;
  layout?: string;
  c?: string;
}>;

const pill = (active: boolean) =>
  `rounded-full px-4 py-1.5 text-sm font-medium transition ${
    active ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100"
  }`;

async function RoutineContent({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const tracker = sp.view === "tracker";
  const { date, today, timeZone } = await resolveDate(sp.date);
  const [allRoutines, categories] = await Promise.all([getRoutines(), getCategories()]);

  // 카테고리별 보기: 오늘 체크, 해빗트래커, 루틴 관리에 모두 적용된다
  const filter = parseCategoryFilter(sp.c, categories.map((c) => c.id));
  const params: RoutineParams = {
    view: tracker ? "tracker" : undefined,
    date: sp.date ? date : undefined,
    month: sp.month,
    layout: sp.layout,
    c: filter,
  };

  // 해빗트래커가 보여줄 달: ?month=YYYY-MM, 없거나 잘못되면 이번 달
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month ?? "") ? `${sp.month}-01` : today;

  const switcher = (
    <div className="mb-5 flex w-fit gap-1 rounded-full bg-zinc-100/70 p-1" role="group" aria-label="루틴 보기">
      <Link href={routineHref(params, { view: undefined })} className={pill(!tracker)} aria-current={!tracker ? "page" : undefined}>
        오늘 체크
      </Link>
      <Link href={routineHref(params, { view: "tracker" })} className={pill(tracker)} aria-current={tracker ? "page" : undefined}>
        해빗트래커
      </Link>
    </div>
  );
  const filterBar = (
    <CategoryFilter params={params} categories={categories} routines={allRoutines} filter={filter} />
  );

  if (tracker) {
    return (
      <>
        {switcher}
        {filterBar}
        <HabitTracker
          month={month}
          layout={sp.layout === "table" ? "table" : "cards"}
          today={today}
          timeZone={timeZone}
          params={params}
          filter={filter}
        />
      </>
    );
  }

  const checklist = (await getRoutineChecklist(date, timeZone)).filter((r) =>
    matchesCategory(r.category_id, filter),
  );
  const routines = allRoutines.filter((r) => matchesCategory(r.category_id, filter));

  return (
    <>
      {switcher}
      {filterBar}
      <DateNav basePath="/routine" date={date} today={today} extra={filter ? `c=${filter}` : undefined} />
      <section className="mt-6">
        <RoutineChecklist key={`${date}:${filter}`} date={date} routines={checklist} categories={categories} />
      </section>
      <details className="mt-10" open={filter !== null || undefined}>
        <summary className="cursor-pointer text-sm font-semibold text-zinc-700">
          루틴 관리
        </summary>
        <div className="mt-5">
          <RoutineManager routines={routines} categories={categories} filtered={filter !== null} />
        </div>
      </details>
    </>
  );
}

export default function RoutinePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<p className="mt-10 text-center text-zinc-400">불러오는 중...</p>}>
      <RoutineContent searchParams={searchParams} />
    </Suspense>
  );
}
