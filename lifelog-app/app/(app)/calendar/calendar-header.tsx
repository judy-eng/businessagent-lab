import Link from "next/link";
import { addDays, addMonths, mondayOf, monthTitle } from "@/lib/dates";
import { calendarHref, type CalendarOpts } from "./options";

function rangeText(date: string) {
  const start = mondayOf(date);
  const end = addDays(start, 6);
  const fmt = (d: string) => `${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일`;
  return `${fmt(start)} – ${fmt(end)}`;
}

const pill = (active: boolean) =>
  `rounded-full px-4 py-1.5 text-sm font-medium transition ${
    active ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100"
  }`;

// 월/주 전환, 보기 방식(도형/점수색) 전환, 이전·다음 이동
export function CalendarHeader({ opts, today }: { opts: CalendarOpts; today: string }) {
  const { view, date, mode } = opts;
  const href = (o: Partial<CalendarOpts>) => calendarHref(opts, o);

  return (
    <header>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">
          {view === "month" ? monthTitle(date) : rangeText(date)}
        </h1>
        <div className="flex gap-1 rounded-full bg-zinc-100/70 p-1" role="group" aria-label="보기 범위">
          <Link href={href({ view: "month" })} className={pill(view === "month")} aria-current={view === "month" ? "page" : undefined}>
            월
          </Link>
          <Link href={href({ view: "week" })} className={pill(view === "week")} aria-current={view === "week" ? "page" : undefined}>
            주
          </Link>
        </div>
      </div>

      {view === "month" ? (
        <nav className="mt-4 grid grid-cols-3 border-b border-zinc-200 text-center text-sm" aria-label="달 이동">
          {[-1, 0, 1].map((offset) => {
            const target = addMonths(date, offset);
            const active = offset === 0;
            return (
              <Link
                key={offset}
                href={href({ date: target })}
                aria-current={active ? "page" : undefined}
                className={`-mb-px border-b-2 py-2 ${
                  active
                    ? "border-zinc-900 font-semibold text-zinc-900"
                    : "border-transparent text-zinc-400 hover:text-zinc-600"
                }`}
              >
                {monthTitle(target)}
              </Link>
            );
          })}
        </nav>
      ) : (
        <nav className="mt-4 flex items-center justify-between border-b border-zinc-200 pb-2 text-sm" aria-label="주 이동">
          <Link href={href({ date: addDays(date, -7) })} className="rounded-full px-3 py-1.5 text-zinc-600 hover:bg-zinc-100">
            ← 지난주
          </Link>
          <Link href={href({ date: addDays(date, 7) })} className="rounded-full px-3 py-1.5 text-zinc-600 hover:bg-zinc-100">
            다음주 →
          </Link>
        </nav>
      )}

      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-1 rounded-full bg-zinc-100/70 p-1" role="group" aria-label="보기 방식">
          <Link href={href({ mode: "shapes" })} className={pill(mode === "shapes")} aria-current={mode === "shapes" ? "true" : undefined}>
            도형
          </Link>
          <Link href={href({ mode: "heat" })} className={pill(mode === "heat")} aria-current={mode === "heat" ? "true" : undefined}>
            점수색
          </Link>
        </div>
        {date !== today && (
          <Link href={href({ date: today })} className="text-xs text-sky-600">
            오늘로
          </Link>
        )}
      </div>
    </header>
  );
}
