import { GROUP_COLORS, GROUP_ORDER } from "@/lib/emotion";
import { monthTitle } from "@/lib/dates";
import type { MonthSummary } from "@/lib/queries";

function Bar({ label, done, total, color }: { label: string; done: number; total: number; color: string }) {
  const percent = total ? Math.round((done / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-zinc-600">{label}</span>
        <span className="tabular-nums text-zinc-800">
          {total ? (
            <>
              <strong>{percent}%</strong> <span className="text-xs text-zinc-500">({done}/{total})</span>
            </>
          ) : (
            <span className="text-xs text-zinc-400">기록 없음</span>
          )}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-100">
        <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// 한 달 요약: 수치만 보여주고 원인을 단정하지 않는다
export function MonthSummaryPanel({ date, summary }: { date: string; summary: MonthSummary }) {
  const { emotion, todo, routine, schedule } = summary;
  const groupTotal = GROUP_ORDER.reduce((sum, g) => sum + emotion.groups[g], 0);

  return (
    <section className="mt-6 rounded-3xl bg-zinc-50 p-5" aria-label={`${monthTitle(date)} 요약`}>
      <h2 className="font-semibold">{monthTitle(date)} 요약</h2>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl bg-white p-3">
          <p className="text-xs text-zinc-500">감정 평균</p>
          <p className="mt-1 text-xl font-bold">
            {emotion.average === null ? "-" : `${Number(emotion.average.toFixed(1))}점`}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-3">
          <p className="text-xs text-zinc-500">감정 기록</p>
          <p className="mt-1 text-xl font-bold">{emotion.entries}회</p>
        </div>
        <div className="rounded-2xl bg-white p-3">
          <p className="text-xs text-zinc-500">기록한 날</p>
          <p className="mt-1 text-xl font-bold">{emotion.days}일</p>
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-sm text-zinc-600">고른 감정의 비율</p>
        {groupTotal === 0 ? (
          <p className="text-sm text-zinc-400">고른 감정이 없어요</p>
        ) : (
          <>
            <div className="flex h-4 overflow-hidden rounded-full bg-zinc-100" role="img"
              aria-label={GROUP_ORDER.map((g) => `${GROUP_COLORS[g].label} ${Math.round((emotion.groups[g] / groupTotal) * 100)}%`).join(", ")}>
              {GROUP_ORDER.map((g) =>
                emotion.groups[g] ? (
                  <div key={g} style={{ width: `${(emotion.groups[g] / groupTotal) * 100}%`, backgroundColor: GROUP_COLORS[g].bg }} />
                ) : null,
              )}
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600">
              {GROUP_ORDER.map((g) => (
                <li key={g} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: GROUP_COLORS[g].bg }} />
                  {GROUP_COLORS[g].label} {Math.round((emotion.groups[g] / groupTotal) * 100)}%
                  <span className="text-zinc-400">({emotion.groups[g]}개)</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="mt-5 space-y-3">
        <Bar label="Todo 완료율" {...todo} color="#8B729C" />
        <Bar label="루틴 달성률 (오늘까지)" {...routine} color="#e0a526" />
        <Bar label="일정 완료율" {...schedule} color="#4f9fd8" />
      </div>
    </section>
  );
}
