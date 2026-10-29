"use client";

import type { HabitRow } from "@/lib/queries";
import { useHabitToggle } from "./habit-state";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// 카드 아래의 작은 원형 차트: 그날 체크한 비율만큼 채워진다
function MiniRing({ percent }: { percent: number }) {
  const size = 26;
  const stroke = 3.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label={`${percent}% 달성`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e4e4e7" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#4f9fd8"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - percent / 100)}
        style={{ transition: "stroke-dashoffset 0.4s ease" }}
      />
    </svg>
  );
}

// 전체 습관: 하루가 카드 하나. 그날 하기로 한 루틴을 체크하고, 카드 아래 원형 차트가 채워진다.
export function HabitCards({ rows, today }: { rows: HabitRow[]; today: string }) {
  const { items, toggle, error } = useHabitToggle(rows, today);

  if (items.length === 0) {
    return (
      <p className="rounded-2xl bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
        이 달에 하기로 한 루틴이 없어요. &lsquo;오늘 체크&rsquo;의 &lsquo;루틴 관리&rsquo;에서 루틴을 등록해보세요.
      </p>
    );
  }

  const dates = items[0].days.map((d) => d.date);

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {dates.map((date, index) => {
          // 그날 하기로 한 루틴만 카드에 나온다
          const todays = items
            .map((r) => ({ row: r, status: r.days[index].status }))
            .filter((x) => x.status !== "off");
          const done = todays.filter((x) => x.status === "done").length;
          const percent = todays.length ? Math.round((done / todays.length) * 100) : 0;
          const isToday = date === today;
          const future = date > today;
          const wd = new Date(`${date}T00:00:00Z`).getUTCDay();

          return (
            <li
              key={date}
              className={`flex flex-col rounded-xl border bg-white p-3 shadow-sm ${
                isToday ? "border-zinc-900 ring-1 ring-zinc-900" : "border-zinc-200"
              } ${future ? "opacity-60" : ""}`}
            >
              <p className="text-sm font-semibold text-zinc-800">
                {Number(date.slice(8, 10))}일
                <span
                  className={`ml-1 text-xs font-normal ${
                    wd === 0 ? "text-red-400" : wd === 6 ? "text-sky-500" : "text-zinc-400"
                  }`}
                >
                  {WEEKDAYS[wd]}
                </span>
                {isToday && <span className="ml-1.5 rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] font-medium text-white">오늘</span>}
              </p>

              {todays.length === 0 ? (
                <p className="mt-3 flex-1 text-xs text-zinc-400">쉬는 날</p>
              ) : (
                <ul className="mt-2 flex-1 space-y-1.5">
                  {todays.map(({ row, status }) => (
                    <li key={row.id}>
                      <label className={`flex items-center gap-2 text-sm ${future ? "" : "cursor-pointer"}`}>
                        <input
                          type="checkbox"
                          checked={status === "done"}
                          disabled={future}
                          onChange={() => toggle(row.id, date, status)}
                          aria-label={`${row.name} ${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일`}
                          className="h-4 w-4 shrink-0 accent-blue-500"
                        />
                        <span
                          className={`truncate ${
                            status === "done" ? "text-zinc-400 line-through" : status === "missed" ? "text-red-400" : ""
                          }`}
                        >
                          {row.name}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}

              {todays.length > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <MiniRing percent={percent} />
                  <span className="text-xs tabular-nums text-zinc-400">
                    {done}/{todays.length}
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
    </>
  );
}
