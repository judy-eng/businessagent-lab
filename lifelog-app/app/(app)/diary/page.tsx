import { Suspense } from "react";
import { DateNav } from "@/components/date-nav";
import { getDiary, resolveDate } from "@/lib/queries";
import { DiaryForm } from "./diary-form";

async function DiaryContent({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date, today } = await resolveDate((await searchParams).date);
  const content = await getDiary(date);
  return (
    <>
      <DateNav basePath="/diary" date={date} today={today} />
      <DiaryForm key={date} date={date} content={content} />
    </>
  );
}

export default function DiaryPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  return (
    <Suspense fallback={<p className="mt-10 text-center text-zinc-400">불러오는 중...</p>}>
      <DiaryContent searchParams={searchParams} />
    </Suspense>
  );
}
