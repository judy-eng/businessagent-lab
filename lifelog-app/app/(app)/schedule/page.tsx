import { Suspense } from "react";
import { DateNav } from "@/components/date-nav";
import { getSchedules, resolveDate } from "@/lib/queries";
import { ScheduleList } from "./schedule-list";

async function ScheduleContent({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date, today } = await resolveDate((await searchParams).date);
  const schedules = await getSchedules(date);
  return (
    <>
      <DateNav basePath="/schedule" date={date} today={today} />
      <ScheduleList key={date} date={date} schedules={schedules} />
    </>
  );
}

export default function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  return (
    <Suspense fallback={<p className="mt-10 text-center text-zinc-400">불러오는 중...</p>}>
      <ScheduleContent searchParams={searchParams} />
    </Suspense>
  );
}
