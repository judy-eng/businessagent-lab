import Link from "next/link";
import { addMonths, endOfMonth, startOfMonth } from "@/lib/dates";
import { getCategories, getHabitTracker } from "@/lib/queries";
import { HabitCards } from "./habit-cards";
import { HabitGrid } from "./habit-grid";
import { matchesCategory, routineHref, type RoutineParams } from "./options";

export type HabitLayout = "cards" | "table";

function GridIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <rect x="1.5" y="1.5" width="4.5" height="4.5" rx="1" />
      <rect x="8" y="1.5" width="4.5" height="4.5" rx="1" />
      <rect x="1.5" y="8" width="4.5" height="4.5" rx="1" />
      <rect x="8" y="8" width="4.5" height="4.5" rx="1" />
    </svg>
  );
}

function TableIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <rect x="1.5" y="2" width="11" height="10" rx="1.2" />
      <path d="M1.5 5.5h11M1.5 8.7h11M5.5 5.5v6.5" />
    </svg>
  );
}

// 해빗트래커 (참고 사진: 노션의 '습관 트래커'): 한 달 동안 하기로 한 루틴을 얼마나 이어갔는지 본다.
// - 전체 습관: 하루가 카드 하나, 카드 아래 원형 차트가 채워진다
// - 표 보기: 루틴(줄) × 날짜(칸) 표와 루틴별 달성률·연속 기록
export async function HabitTracker({
  month,
  layout,
  today,
  timeZone,
  params,
  filter,
}: {
  month: string; // 그 달의 아무 날짜
  layout: HabitLayout;
  today: string;
  timeZone: string;
  params: RoutineParams; // 주소 만들 때 유지할 값
  filter: string | null; // 카테고리별 보기
}) {
  const monthStart = startOfMonth(month);
  const [allRows, categories] = await Promise.all([
    getHabitTracker(monthStart, endOfMonth(month), today, timeZone),
    getCategories(),
  ]);
  // 카테고리를 골랐으면 그 카테고리의 루틴만
  const rows = allRows.filter((r) => matchesCategory(r.categoryId, filter));

  // 이 달 전체 달성률 (오늘까지, 하기로 한 날 기준)
  let counted = 0;
  let done = 0;
  for (const r of rows) {
    for (const d of r.days) {
      if (d.status === "off" || d.date > today) continue;
      counted += 1;
      if (d.status === "done") done += 1;
    }
  }

  const href = (m: string, l: HabitLayout = layout) =>
    routineHref(params, { view: "tracker", month: m.slice(0, 7), layout: l });
  const arrow = "rounded-full px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100";
  const tab = (active: boolean) =>
    `-mb-px flex items-center gap-1.5 border-b-2 px-1 pb-2 text-sm ${
      active ? "border-zinc-900 font-semibold text-zinc-900" : "border-transparent text-zinc-400 hover:text-zinc-600"
    }`;

  return (
    <>
      {/* 안내 */}
      <div className="flex gap-3 rounded-lg bg-zinc-100/70 p-4 text-sm leading-relaxed text-zinc-700">
        <span aria-hidden="true">💡</span>
        <p>
          한 가지 루틴을 완료할 때마다 카드 아래의 원형 차트가 채워집니다. 반복 요일이 아닌 날은 &lsquo;쉬는 날&rsquo;로 보이고, 연속 기록을 끊지 않아요.
        </p>
      </div>

      {/* 달 이동과 달 제목 */}
      <div className="mt-6 flex items-center justify-between">
        <Link href={href(addMonths(monthStart, -1))} className={arrow} aria-label="이전 달">
          ←
        </Link>
        <div className="text-center">
          <h1 className="text-2xl font-bold">{Number(monthStart.slice(5, 7))}월 — 습관 트래커</h1>
          <p className="mt-0.5 text-xs text-zinc-500">
            {monthStart.slice(0, 4)}년 ·{" "}
            {counted ? (
              <>
                전체 달성률 <strong className="text-zinc-800">{Math.round((done / counted) * 100)}%</strong> ({done}/{counted})
              </>
            ) : (
              "아직 달성 기록이 없어요"
            )}
          </p>
        </div>
        <Link href={href(addMonths(monthStart, 1))} className={arrow} aria-label="다음 달">
          →
        </Link>
      </div>
      {monthStart !== startOfMonth(today) && (
        <div className="mt-1 text-right">
          <Link href={routineHref(params, { view: "tracker", month: undefined, layout })} className="text-xs text-sky-600">
            이번 달로
          </Link>
        </div>
      )}

      {/* 보기 전환: 전체 습관 / 표 보기 */}
      <nav className="mt-5 flex gap-5 border-b border-zinc-200" aria-label="해빗트래커 보기">
        <Link href={href(monthStart, "cards")} className={tab(layout === "cards")} aria-current={layout === "cards" ? "page" : undefined}>
          <GridIcon /> 전체 습관
        </Link>
        <Link href={href(monthStart, "table")} className={tab(layout === "table")} aria-current={layout === "table" ? "page" : undefined}>
          <TableIcon /> 표 보기
        </Link>
      </nav>

      <div className="mt-5">
        {layout === "cards" ? (
          <HabitCards key={monthStart} rows={rows} today={today} />
        ) : (
          <HabitGrid key={monthStart} rows={rows} today={today} categories={categories} />
        )}
      </div>
    </>
  );
}
