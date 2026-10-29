import Link from "next/link";
import { Suspense } from "react";
import { SearchBar } from "@/components/search-bar";
import { WEEKDAY_LABELS, formatKorean } from "@/lib/dates";
import { getEmotionTypes, resolveDate } from "@/lib/queries";
import { SEARCH_KINDS, SEARCH_QUERY_MAX, searchAll, type Hit, type SearchKind } from "@/lib/search";
import { HitCard, Marked } from "./hit-card";

type SearchParams = Promise<{ q?: string; t?: string }>;

const KIND_LABEL: Record<SearchKind, string> = {
  emotion: "감정",
  todo: "Todo",
  schedule: "일정",
  diary: "일기",
  memo: "한 줄",
  routine: "루틴",
};

function href(q: string, kind: SearchKind | null) {
  return `/search?q=${encodeURIComponent(q)}${kind ? `&t=${kind}` : ""}`;
}

async function SearchContent({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, SEARCH_QUERY_MAX);
  const kind = SEARCH_KINDS.find((k) => k === sp.t) ?? null;

  if (!q) {
    return (
      <>
        <h1 className="text-3xl font-bold tracking-tight">검색</h1>
        <div className="mt-5">
          <SearchBar autoFocus />
        </div>
        <section className="mt-8 rounded-2xl bg-zinc-50 p-5 text-sm leading-relaxed text-zinc-600">
          <p className="font-semibold text-zinc-800">이렇게 찾아보세요</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>감정 이름(예: &ldquo;피곤&rdquo;)을 검색하면 그 감정을 고른 날이 나와요.</li>
            <li>일기, 한 줄, Todo, 일정, 감정의 원인 글에서 단어를 찾아요.</li>
            <li>루틴 이름을 검색하면 얼마나 완료했는지 보여줘요.</li>
          </ul>
        </section>
      </>
    );
  }

  const { timeZone } = await resolveDate(undefined);
  const [results, types] = await Promise.all([searchAll(q), getEmotionTypes({ includeHidden: true })]);
  const typeById = new Map(types.map((t) => [t.id, t]));
  const total = results.hits.length + results.routines.length;

  const shown: Hit[] = kind && kind !== "routine" ? results.hits.filter((h) => h.kind === kind) : kind === "routine" ? [] : results.hits;
  const showRoutines = kind === null || kind === "routine";

  // 날짜별로 묶는다 (이미 날짜 내림차순)
  const byDate = new Map<string, Hit[]>();
  for (const h of shown) byDate.set(h.date, [...(byDate.get(h.date) ?? []), h]);

  const chip = (active: boolean, disabled = false) =>
    `rounded-full px-3 py-1.5 text-sm transition ${
      active ? "bg-zinc-900 text-white" : disabled ? "bg-zinc-50 text-zinc-300" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
    }`;

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">검색</h1>
      <div className="mt-5">
        <SearchBar defaultValue={q} />
      </div>

      <p className="mt-5 text-sm text-zinc-600" role="status">
        &lsquo;<strong className="text-zinc-900">{q}</strong>&rsquo; 검색 결과 <strong className="text-zinc-900">{total}</strong>개
      </p>

      <nav className="mt-3 flex flex-wrap gap-2" aria-label="종류별 보기">
        <Link href={href(q, null)} className={chip(kind === null)} aria-current={kind === null ? "true" : undefined}>
          전체 {total}
        </Link>
        {SEARCH_KINDS.map((k) =>
          results.counts[k] > 0 ? (
            <Link key={k} href={href(q, k)} className={chip(kind === k)} aria-current={kind === k ? "true" : undefined}>
              {KIND_LABEL[k]} {results.counts[k]}
            </Link>
          ) : (
            <span key={k} className={chip(false, true)}>
              {KIND_LABEL[k]} 0
            </span>
          ),
        )}
      </nav>

      {total === 0 && (
        <p className="mt-10 rounded-2xl bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-500">
          찾은 기록이 없어요. 다른 단어로 검색해보세요.
        </p>
      )}

      {showRoutines && results.routines.length > 0 && (
        <section className="mt-6" aria-label="루틴">
          <h2 className="mb-2 text-sm font-semibold text-zinc-600">루틴</h2>
          <ul className="space-y-2">
            {results.routines.map((r) => (
              <li key={r.id}>
                <Link href="/routine?view=tracker" className="block rounded-2xl bg-amber-100/60 p-3.5 transition hover:brightness-95">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 shrink-0 rounded-md bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-900">루틴</span>
                    <div className="min-w-0 text-sm">
                      <p className="font-medium">
                        <Marked text={r.name} query={q} />
                        {!r.active && <span className="ml-2 text-xs font-normal text-zinc-400">(중단됨)</span>}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {r.repeatDays.length === 7 ? "매일" : r.repeatDays.map((d) => WEEKDAY_LABELS[d]).join(" ")}
                        {r.categoryName ? ` · ${r.categoryName}` : ""} · 완료한 날 {r.doneDays}일
                        {r.lastDone ? ` · 마지막 ${Number(r.lastDone.slice(5, 7))}월 ${Number(r.lastDone.slice(8, 10))}일` : ""}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {[...byDate.entries()].map(([date, hits]) => (
        <section key={date} className="mt-6" aria-label={formatKorean(date)}>
          <h2 className="mb-2 text-sm font-semibold text-zinc-600">
            <Link href={`/calendar?date=${date}`} className="underline-offset-2 hover:underline">
              {formatKorean(date)}
            </Link>
          </h2>
          <ul className="space-y-2">
            {hits.map((h, i) => (
              <li key={`${h.kind}:${i}`}>
                <HitCard hit={h} query={q} typeById={typeById} timeZone={timeZone} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {results.capped && (
        <p className="mt-6 text-center text-xs text-zinc-400">결과가 많아서 최근 것 위주로 보여줘요. 검색어를 더 구체적으로 써보세요.</p>
      )}
    </>
  );
}

export default function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<p className="mt-10 text-center text-zinc-400">불러오는 중...</p>}>
      <SearchContent searchParams={searchParams} />
    </Suspense>
  );
}
