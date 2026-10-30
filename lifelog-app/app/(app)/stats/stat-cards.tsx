import { WEEKDAY_LABELS } from "@/lib/dates";
import { scoreColor } from "@/lib/emotion";
import {
  MIN_EMOTION_SAMPLES,
  MIN_ROUTINE_DAYS,
  type CategoryRoutineStat,
  type SampleStat,
} from "@/lib/stats-calc";
import { SLOT_LABELS, type TimeSlot } from "@/lib/time-slot";

// 기준을 못 채웠을 때: 숫자 대신 진행 표시 (기획안: "아직 기록이 부족해요 (2/4)")
function Insufficient({ n, min }: { n: number; min: number }) {
  return (
    <div className="flex flex-1 items-center gap-3">
      <span className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
        <span className="block h-full rounded-full bg-zinc-300" style={{ width: `${Math.min(100, (n / min) * 100)}%` }} />
      </span>
      <span className="shrink-0 text-xs text-zinc-400">
        아직 기록이 부족해요 ({n}/{min})
      </span>
    </div>
  );
}

function ScoreBar({ stat }: { stat: SampleStat }) {
  if (!stat.enough || stat.average === null) return <Insufficient n={stat.n} min={MIN_EMOTION_SAMPLES} />;
  return (
    <div className="flex flex-1 items-center gap-3">
      <span className="h-3 flex-1 overflow-hidden rounded-full bg-zinc-100">
        <span
          className="block h-full rounded-full"
          style={{ width: `${(stat.average / 10) * 100}%`, backgroundColor: scoreColor(stat.average) }}
        />
      </span>
      <span className="w-24 shrink-0 text-right text-sm tabular-nums">
        <strong>{Number(stat.average.toFixed(1))}점</strong>
        <span className="ml-1 text-[11px] text-zinc-400">기록 {stat.n}개 기준</span>
      </span>
    </div>
  );
}

function Card({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-zinc-50 p-5">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-0.5 text-xs text-zinc-500">{note}</p>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

export function WeekdayCard({ stats }: { stats: (SampleStat & { weekday: number })[] }) {
  return (
    <Card title="요일별 감정 평균" note={`요일마다 기록이 ${MIN_EMOTION_SAMPLES}개 이상 모이면 평균을 보여줘요. 점수는 0(가장 나쁨)~10(가장 좋음)이에요.`}>
      {stats.map((s) => (
        <div key={s.weekday} className="flex items-center gap-3">
          <span className="w-6 shrink-0 text-sm text-zinc-600">{WEEKDAY_LABELS[s.weekday]}</span>
          <ScoreBar stat={s} />
        </div>
      ))}
    </Card>
  );
}

export function SlotCard({ stats }: { stats: (SampleStat & { slot: TimeSlot })[] }) {
  return (
    <Card title="시간대별 감정 평균" note={`시간대마다 기록이 ${MIN_EMOTION_SAMPLES}개 이상 모이면 평균을 보여줘요. 같은 시간대에 여러 번 기록한 것도 모두 세요.`}>
      {stats.map((s) => (
        <div key={s.slot} className="flex items-center gap-3">
          <span className="w-16 shrink-0 text-sm text-zinc-600">{SLOT_LABELS[s.slot]}</span>
          <ScoreBar stat={s} />
        </div>
      ))}
    </Card>
  );
}

export function RoutineCard({ stats }: { stats: CategoryRoutineStat[] }) {
  return (
    <Card title="카테고리별 루틴 달성률" note={`그 카테고리의 루틴을 하기로 한 날이 ${MIN_ROUTINE_DAYS}일 이상 쌓이면 달성률을 보여줘요.`}>
      {stats.length === 0 ? (
        <p className="text-sm text-zinc-400">이 기간에 하기로 한 루틴이 없어요.</p>
      ) : (
        stats.map((s) => (
          <div key={s.id ?? "none"} className="flex items-center gap-3">
            <span className="w-20 shrink-0 truncate text-sm text-zinc-600">{s.name}</span>
            {s.enough && s.rate !== null ? (
              <div className="flex flex-1 items-center gap-3">
                <span className="h-3 flex-1 overflow-hidden rounded-full bg-zinc-100">
                  <span className="block h-full rounded-full bg-amber-500" style={{ width: `${Math.round(s.rate * 100)}%` }} />
                </span>
                <span className="w-28 shrink-0 text-right text-sm tabular-nums">
                  <strong>{Math.round(s.rate * 100)}%</strong>
                  <span className="ml-1 text-[11px] text-zinc-400">
                    {s.days}일 기준 · {s.done}/{s.scheduled}
                  </span>
                </span>
              </div>
            ) : (
              <Insufficient n={s.days} min={MIN_ROUTINE_DAYS} />
            )}
          </div>
        ))
      )}
    </Card>
  );
}
