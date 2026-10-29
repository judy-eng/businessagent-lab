import { Suspense } from "react";
import { DateNav } from "@/components/date-nav";
import {
  getCategories,
  getRoutineChecklist,
  getRoutines,
  resolveDate,
} from "@/lib/queries";
import { RoutineChecklist } from "./routine-checklist";
import { RoutineManager } from "./routine-manager";

async function RoutineContent({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date, today, timeZone } = await resolveDate((await searchParams).date);
  const [checklist, routines, categories] = await Promise.all([
    getRoutineChecklist(date, timeZone),
    getRoutines(),
    getCategories(),
  ]);
  const categoryNames = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  return (
    <>
      <DateNav basePath="/routine" date={date} today={today} />
      <section className="mt-6">
        <RoutineChecklist
          key={date}
          date={date}
          routines={checklist}
          categoryNames={categoryNames}
        />
      </section>
      <details className="mt-10">
        <summary className="cursor-pointer text-sm font-semibold text-zinc-700">
          루틴 관리
        </summary>
        <div className="mt-5">
          <RoutineManager routines={routines} categories={categories} />
        </div>
      </details>
    </>
  );
}

export default function RoutinePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  return (
    <Suspense fallback={<p className="mt-10 text-center text-zinc-400">불러오는 중...</p>}>
      <RoutineContent searchParams={searchParams} />
    </Suspense>
  );
}
