"use client";

import type { HabitRow, HabitStatus } from "@/lib/queries";
import { useHabitToggle } from "./habit-state";
import { groupByCategory } from "./options";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function weekday(date: string) {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

// 칸 하나: 체크함(채운 원), 놓침(×), 아직(점선 원), 하기로 하지 않은 날(작은 점)
// 칸 너비에 맞춰 원이 줄어든다 (최대 24px)
function Cell({
  status,
  date,
  today,
  name,
  onToggle,
}: {
  status: HabitStatus;
  date: string;
  today: string;
  name: string;
  onToggle: () => void;
}) {
  const label = `${name} ${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일`;
  const box = { width: "min(100%, 24px)", aspectRatio: "1 / 1" } as const;
  if (status === "off") {
    return (
      <span className="mx-auto flex items-center justify-center" style={box} aria-label={`${label} 쉬는 날`}>
        <span className="h-1 w-1 rounded-full bg-zinc-300" />
      </span>
    );
  }
  const base = "mx-auto flex items-center justify-center rounded-full text-[10px] leading-none transition";
  if (date > today) {
    return <span className={`${base} border border-dashed border-zinc-300`} style={box} aria-label={`${label} 예정`} />;
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={status === "done"}
      aria-label={`${label} ${status === "done" ? "완료 (누르면 취소)" : "미완료 (누르면 완료)"}`}
      style={box}
      className={`${base} cursor-pointer ${
        status === "done"
          ? "bg-amber-500 font-bold text-white hover:bg-amber-600"
          : status === "missed"
            ? "border border-red-200 bg-red-50 text-red-400 hover:bg-red-100"
            : "border border-dashed border-amber-400 hover:bg-amber-50"
      }`}
    >
      {status === "done" ? "✓" : status === "missed" ? "×" : ""}
    </button>
  );
}

// 해빗트래커 표 보기: 루틴(줄) × 날짜(칸). 한 달의 모든 날짜가 가로 스크롤 없이 한 화면에 보인다.
export function HabitGrid({
  rows,
  today,
  categories,
}: {
  rows: HabitRow[];
  today: string;
  categories: { id: string; name: string }[];
}) {
  const { items, toggle, error } = useHabitToggle(rows, today);

  if (items.length === 0) {
    return (
      <p className="rounded-2xl bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
        이 달에 하기로 한 루틴이 없어요. &lsquo;오늘 체크&rsquo;의 &lsquo;루틴 관리&rsquo;에서 루틴을 등록해보세요.
      </p>
    );
  }

  const dates = items[0].days.map((d) => d.date);
  // 루틴을 카테고리별로 묶는다 (카테고리를 쓰지 않으면 제목 없이 한 덩어리)
  const groups = groupByCategory(
    items.map((r) => ({ ...r, category_id: r.categoryId })),
    categories,
  );
  const showHeadings = groups.length > 1 || groups.some((g) => g.id !== null);

  // 본문 폭보다 넓게(최대 1040px) 가운데로 펼쳐서 한 달 전체가 스크롤 없이 보이게 한다
  return (
    <div className="relative left-1/2 w-[min(1040px,calc(100vw-2rem))] -translate-x-1/2">
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full table-fixed border-collapse text-center">
          <colgroup>
            <col className="w-[7.5rem] sm:w-[10.5rem]" />
            {dates.map((d) => (
              <col key={d} />
            ))}
          </colgroup>
          <thead>
            <tr className="bg-zinc-50">
              <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500">루틴</th>
              {dates.map((d) => {
                const isToday = d === today;
                const wd = weekday(d);
                return (
                  <th key={d} className="px-0 py-1.5 font-normal">
                    <span
                      className={`mx-auto flex w-full max-w-[26px] flex-col items-center rounded-md py-0.5 ${
                        isToday ? "bg-zinc-900 text-white" : wd === 0 ? "text-red-400" : wd === 6 ? "text-sky-500" : "text-zinc-500"
                      }`}
                    >
                      <span className="text-[9px] leading-tight opacity-80">{WEEKDAYS[wd]}</span>
                      <span className="text-[11px] font-semibold leading-tight">{Number(d.slice(8, 10))}</span>
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          {groups.map((g) => (
            <tbody key={g.id ?? "none"}>
              {showHeadings && (
                <tr className="border-t border-zinc-100 bg-amber-50/60">
                  <th colSpan={dates.length + 1} className="px-3 py-1.5 text-left text-xs font-semibold text-amber-900">
                    {g.name} <span className="font-normal text-zinc-400">{g.items.length}개</span>
                  </th>
                </tr>
              )}
              {g.items.map((row) => {
                const counted = row.days.filter((d) => d.status !== "off" && d.date <= today);
                const done = counted.filter((d) => d.status === "done").length;
                const percent = counted.length ? Math.round((done / counted.length) * 100) : null;
                return (
                  <tr key={row.id} className="border-t border-zinc-100">
                    <th className="px-3 py-1.5 text-left font-normal">
                      <span className={`block truncate text-sm font-medium ${row.active ? "" : "text-zinc-400"}`}>
                        {row.name}
                        {!row.active && <span className="ml-1 text-[10px]">(중단)</span>}
                      </span>
                      <span className="mt-0.5 block text-[10px] leading-tight tabular-nums text-zinc-500">
                        <strong className="text-zinc-800">{percent === null ? "-" : `${percent}%`}</strong>{" "}
                        ({done}/{counted.length}) · 연속 <strong className="text-amber-700">{row.streak}</strong>일 · 최장 {row.best}일
                      </span>
                    </th>
                    {row.days.map((d) => (
                      <td key={d.date} className="px-0 py-1.5">
                        <Cell
                          status={d.status}
                          date={d.date}
                          today={today}
                          name={row.name}
                          onToggle={() => toggle(row.id, d.date, d.status)}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500" aria-label="범례">
        <li className="flex items-center gap-1.5">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] text-white">✓</span> 완료
        </li>
        <li className="flex items-center gap-1.5">
          <span className="flex h-4 w-4 items-center justify-center rounded-full border border-red-200 bg-red-50 text-[10px] text-red-400">×</span> 놓침
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-4 w-4 rounded-full border border-dashed border-amber-400" /> 오늘/예정
        </li>
        <li className="flex items-center gap-1.5">
          <span className="flex h-4 w-4 items-center justify-center"><span className="h-1 w-1 rounded-full bg-zinc-300" /></span> 쉬는 날
        </li>
      </ul>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
