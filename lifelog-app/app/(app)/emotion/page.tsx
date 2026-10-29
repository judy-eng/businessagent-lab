import { Suspense } from "react";
import { DateNav } from "@/components/date-nav";
import {
  getEmotionEntries,
  getEmotionTypes,
  resolveDate,
} from "@/lib/queries";
import { EmotionEntries } from "./emotion-entries";
import { EmotionForm } from "./emotion-form";

async function EmotionContent({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date, today, timeZone } = await resolveDate((await searchParams).date);
  const [entries, types, allTypes] = await Promise.all([
    getEmotionEntries(date),
    getEmotionTypes(),
    getEmotionTypes({ includeHidden: true }),
  ]);

  return (
    <>
      <DateNav basePath="/emotion" date={date} today={today} />
      <section className="mt-6">
        <EmotionEntries entries={entries} types={allTypes} timeZone={timeZone} />
      </section>
      {date === today ? (
        <EmotionForm types={types} />
      ) : (
        <p className="mt-8 text-center text-sm text-zinc-400">
          감정은 지금 이 순간의 기분을 기록해요. 오늘 화면에서 기록할 수 있어요.
        </p>
      )}
    </>
  );
}

export default function EmotionPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  return (
    <Suspense fallback={<p className="mt-10 text-center text-zinc-400">불러오는 중...</p>}>
      <EmotionContent searchParams={searchParams} />
    </Suspense>
  );
}
