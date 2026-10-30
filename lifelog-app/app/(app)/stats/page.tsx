import Link from "next/link";
import { Suspense } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  mondayOf,
  startOfMonth,
  weekOfMonth,
} from "@/lib/dates";
import { resolveDate } from "@/lib/queries";
import { getPeriodEmotion, getStats, type StatsRange } from "@/lib/stats";
import { StatsHero } from "./hero";
import { RoutineCard, SlotCard, WeekdayCard } from "./stat-cards";

type SearchParams = Promise<{ p?: string; date?: string; r?: string }>;
type Period = "day" | "week" | "month";

const PERIODS: { key: Period; label: string }[] = [
  { key: "day", label: "오늘" },
  { key: "week", label: "주" },
  { key: "month", label: "월" },
];
const RANGES: { key: StatsRange; label: string }[] = [
  { key: "4w", label: "최근 4주" },
  { key: "12w", label: "최근 12주" },
  { key: "all", label: "전체" },
];

function url(p: Period, date: string, r: StatsRange) {
  const params = new URLSearchParams({ p, date });
  if (r !== "all") params.set("r", r);
  return `/stats?${params.toString()}`;
}

const md = (d: string) => `${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일`;

async function StatsContent({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const period: Period = sp.p === "day" || sp.p === "month" ? sp.p : "week";
  const range: StatsRange = sp.r === "4w" || sp.r === "12w" ? sp.r : "all";
  const { date, today, timeZone } = await resolveDate(sp.date);

  // 보고 있는 기간: 오늘(그 하루) / 주(월~일) / 월
  let start = date;
  let end = date;
  let title: string;
  if (period === "day") {
    title = date === today ? "오늘" : md(date);
  } else if (period === "week") {
    start = mondayOf(date);
    end = addDays(start, 6);
    title = weekOfMonth(date).text; // 예: 10월 다섯째 주
  } else {
    start = startOfMonth(date);
    end = endOfMonth(date);
    title = `${Number(date.slice(5, 7))}월`;
  }
  const step = period === "day" ? addDays(date, 1) : period === "week" ? addDays(date, 7) : addMonths(date, 1);
  const back = period === "day" ? addDays(date, -1) : period === "week" ? addDays(date, -7) : addMonths(date, -1);

  const [data, stats] = await Promise.all([getPeriodEmotion(start, end), getStats(range, today, timeZone)]);

  const pill = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-medium transition ${active ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100"}`;
  const arrow = "rounded-full px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100";

  return (
    <>
      {/* 보고 있는 기간: 오늘 / 주 / 월 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 rounded-full bg-zinc-100/70 p-1" role="group" aria-label="기간">
          {PERIODS.map((o) => (
            <Link key={o.key} href={url(o.key, date, range)} className={pill(period === o.key)} aria-current={period === o.key ? "page" : undefined}>
              {o.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Link href={url(period, back, range)} className={arrow} aria-label="이전">
            ←
          </Link>
          <Link href={url(period, step, range)} className={arrow} aria-label="다음">
            →
          </Link>
        </div>
      </div>
      {date !== today && (
        <div className="mt-1 text-right">
          <Link href={url(period, today, range)} className="text-xs text-sky-600">
            오늘로
          </Link>
        </div>
      )}

      <div className="mt-4">
        <StatsHero title={title} corner={period === "day" ? date.replaceAll("-", ".") : `${start.slice(5).replace("-", ".")} – ${end.slice(5).replace("-", ".")}`} data={data} />
      </div>

      {/* 기본 통계: 분석 범위 안의 기록으로 계산한다 */}
      <div className="mt-10 flex items-baseline justify-between">
        <h2 className="text-xl font-bold">분석</h2>
        <span className="text-xs text-zinc-400">
          {md(stats.start)}부터 · 감정 기록 {stats.totalEntries}회
        </span>
      </div>
      <nav className="mt-3 flex flex-wrap gap-2" aria-label="분석 범위">
        {RANGES.map((o) => (
          <Link
            key={o.key}
            href={url(period, date, o.key)}
            aria-current={range === o.key ? "true" : undefined}
            className={`rounded-full px-3 py-1.5 text-sm transition ${range === o.key ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
          >
            {o.label}
          </Link>
        ))}
      </nav>
      <div className="mt-4 space-y-4">
        <WeekdayCard stats={stats.weekday} />
        <SlotCard stats={stats.slot} />
        <RoutineCard stats={stats.routine} />
      </div>
      <p className="mt-6 text-xs leading-relaxed text-zinc-400">
        숫자는 기록에서 확인되는 평균과 비율이에요. 어떤 일 때문에 기분이 달라졌다고 단정하지 않아요.
      </p>
    </>
  );
}

export default function StatsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<p className="mt-10 text-center text-zinc-400">불러오는 중...</p>}>
      <StatsContent searchParams={searchParams} />
    </Suspense>
  );
}
