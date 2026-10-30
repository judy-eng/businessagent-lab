import Link from "next/link";
import { GROUP_COLORS, GROUP_ORDER } from "@/lib/emotion";
import { MOOD_PHOTOS, moodOfAverage } from "@/lib/stats-calc";
import type { PeriodEmotion } from "@/lib/stats";

// 통계 화면의 큰 머리 부분 (참고 사진 `통계 분석 배경.jpg`: 큰 세리프 제목, 작은 보조 정보, 모서리 라벨).
// 배경은 보고 있는 기간에 고른 감정이 속한 그룹의 색만 나타난다.
export function StatsHero({
  title,
  corner,
  data,
  action,
}: {
  title: string; // 기간 이름 (예: "이번 주", "10월")
  corner: string; // 오른쪽 위 작은 글씨 (예: 날짜)
  data: PeriodEmotion;
  action?: React.ReactNode; // 오른쪽 위에 놓는 버튼 ('요약 보기')
}) {
  // 기록이 없으면 '감정 없을 때' 배경, 있으면 점수 평균에 맞는 사진 (모든 사진이 밝아서 글씨는 어둡게)
  const empty = data.entries === 0 || data.average === null;
  const mood = empty ? null : moodOfAverage(data.average as number);
  const photo = mood ? MOOD_PHOTOS[mood] : "/ui/empty-emotion.jpg";
  const style = { backgroundImage: `url('${photo}')`, backgroundSize: "cover", backgroundPosition: "center" };
  const text = "text-zinc-900";
  const sub = "text-zinc-700";
  const MOOD_LABEL = { positive: "Positive mood", neutral: "Neutral mood", negative: "Negative mood" } as const;

  return (
    <section
      className={`relative flex min-h-[22rem] flex-col justify-between overflow-hidden rounded-3xl p-6 ${text}`}
      style={style}
      aria-label={`${title} 감정 요약`}
    >
      <div className="flex items-start justify-between text-[11px] font-medium uppercase tracking-[0.18em]">
        <span>Statistics</span>
        <span className="flex flex-col items-end gap-2">
          <span className="tabular-nums">{corner}</span>
          {action && <span className="relative normal-case tracking-normal">{action}</span>}
        </span>
      </div>

      {empty ? (
        <div className="my-auto py-6">
          <h2 className="font-serif text-5xl leading-none tracking-tight">{title}</h2>
          <p className={`mt-5 text-lg font-medium leading-snug ${sub}`}>
            기록된 감정이 없습니다. 오늘의 감정을 추가해주세요
          </p>
          <Link
            href="/emotion"
            className="mt-5 inline-block rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white"
          >
            감정 기록하러 가기
          </Link>
        </div>
      ) : (
        <div className="py-6">
          <h2 className="font-serif text-5xl leading-[1.02] tracking-tight sm:text-6xl">{title}</h2>
          <p className="font-serif text-5xl italic leading-[1.02] tracking-tight sm:text-6xl">Mood</p>
        </div>
      )}

      <div className={`text-sm tabular-nums ${sub}`}>
        {!empty && (
          <>
            <p className="font-medium">
              평균 {data.average === null ? "-" : `${Number(data.average.toFixed(1))}점`} · 감정 기록 {data.entries}회
            </p>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {GROUP_ORDER.map((g) => (
                <li key={g} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10" style={{ backgroundColor: GROUP_COLORS[g].bg }} />
                  {GROUP_COLORS[g].label} {data.groups[g]}
                </li>
              ))}
            </ul>
          </>
        )}
        {/* 이 화면은 숫자만 보여주고 원인을 단정하지 않는다 */}
        <p className="mt-3 text-[10px] uppercase tracking-[0.18em] opacity-70">
          {mood ? MOOD_LABEL[mood] : "No emotions yet"}
        </p>
      </div>
    </section>
  );
}
