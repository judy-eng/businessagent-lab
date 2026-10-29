import { Suspense } from "react";
import { formatKorean } from "@/lib/dates";
import { getDayMemo, getMemos, resolveDate } from "@/lib/queries";
import { MemoForm } from "../memo-form";
import { MemoRow } from "./memo-row";

async function MemosContent() {
  const { today } = await resolveDate(undefined);
  const [memos, todayMemo] = await Promise.all([getMemos(), getDayMemo(today)]);

  // 오늘 것은 위의 입력칸에서 다루고, 아래에는 지난 한 줄을 달별로 모아 보여준다
  const past = memos.filter((m) => m.date !== today);
  const groups = new Map<string, typeof past>();
  for (const m of past) {
    const key = m.date.slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">한 줄</h1>
      <p className="mt-1 text-sm text-zinc-500">하루를 한 줄로 남긴 기록을 모아봐요.</p>

      <section className="mt-6 rounded-3xl bg-gradient-to-br from-emerald-50 to-sky-50 p-5">
        <p className="text-xs text-zinc-500">{formatKorean(today)} · 오늘</p>
        <MemoForm key={todayMemo} date={today} memo={todayMemo} />
      </section>

      {past.length === 0 ? (
        <p className="mt-10 rounded-2xl bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
          아직 지난 한 줄이 없어요. 홈이나 여기서 오늘의 한 줄을 남겨보세요.
        </p>
      ) : (
        [...groups.entries()].map(([month, rows]) => (
          <section key={month} className="mt-8">
            <h2 className="mb-3 text-sm font-semibold text-zinc-600">
              {month.slice(0, 4)}년 {Number(month.slice(5, 7))}월 <span className="font-normal text-zinc-400">· {rows.length}개</span>
            </h2>
            <ul className="space-y-2">
              {rows.map((m) => (
                <MemoRow key={`${m.date}:${m.memo}`} date={m.date} label={formatKorean(m.date)} memo={m.memo} />
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
}

export default function MemosPage() {
  return (
    <Suspense fallback={<p className="mt-10 text-center text-zinc-400">불러오는 중...</p>}>
      <MemosContent />
    </Suspense>
  );
}
