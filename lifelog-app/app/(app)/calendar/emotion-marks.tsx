import { EmotionShape } from "@/components/emotion-shape";
import type { EmotionGroup } from "@/lib/emotion";
import type { DayEmotionMark } from "@/lib/queries";

const MAX_SHOWN = 8;

// 날짜 칸 안의 감정 도형 묶음. 기록한 감정 하나가 도형 하나다.
// 기록이 없는 날(오늘까지)은 회색 점으로 표시한다.
// dimNonMatching을 주면 그 조건에 맞지 않는 도형은 흐리게 보인다 (감정 필터).
export function EmotionMarks({
  marks,
  groupOf,
  showEmptyDot,
  size = 11,
  isMatch,
}: {
  marks: DayEmotionMark[] | undefined;
  groupOf: Map<number, EmotionGroup>;
  showEmptyDot: boolean;
  size?: number;
  isMatch?: (mark: DayEmotionMark) => boolean;
}) {
  if (!marks || marks.length === 0) {
    return showEmptyDot ? (
      <span className="block h-2.5 w-2.5 rounded-full bg-zinc-200" aria-label="기록 없음" />
    ) : null;
  }
  // 필터가 켜져 있으면 맞는 도형을 앞으로 보내 잘리지 않게 한다
  const ordered = isMatch ? [...marks].sort((a, b) => Number(isMatch(b)) - Number(isMatch(a))) : marks;
  const shown = ordered.slice(0, MAX_SHOWN);
  const rest = marks.length - shown.length;
  return (
    <span
      className="flex flex-wrap items-center justify-center gap-[3px]"
      aria-label={`감정 ${marks.length}개 기록`}
    >
      {shown.map((m, i) => (
        <span key={i} className={isMatch && !isMatch(m) ? "opacity-25" : ""}>
          <EmotionShape
            typeId={m.typeId}
            grp={m.typeId === null ? null : (groupOf.get(m.typeId) ?? null)}
            score={m.score}
            size={size}
          />
        </span>
      ))}
      {rest > 0 && <span className="text-[10px] text-zinc-400">+{rest}</span>}
    </span>
  );
}
