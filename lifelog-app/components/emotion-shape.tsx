import { GROUP_COLORS, scoreColor, type EmotionGroup } from "@/lib/emotion";

// 캘린더 날짜 칸의 감정 도형. 같은 감정은 항상 같은 모양이고, 색은 그 감정이 속한 그룹의 색이다.
// 감정 종류 없이 점수만 기록한 경우(grp 없음)에는 점수 색의 빈 동그라미로 그린다.
const KINDS = 6;

export function EmotionShape({
  typeId,
  grp,
  score,
  size = 11,
}: {
  typeId: number | null;
  grp: EmotionGroup | null;
  score: number;
  size?: number;
}) {
  if (typeId === null || grp === null) {
    return (
      <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true">
        <circle cx="5" cy="5" r="3.6" fill="none" stroke={scoreColor(score)} strokeWidth="1.6" />
      </svg>
    );
  }
  const fill = GROUP_COLORS[grp].bg;
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill={fill} aria-hidden="true">
      {shapeOf(typeId % KINDS)}
    </svg>
  );
}

function shapeOf(kind: number) {
  switch (kind) {
    case 0:
      return <circle cx="5" cy="5" r="4.5" />;
    case 1:
      return <rect x="0.8" y="0.8" width="8.4" height="8.4" rx="2.2" />;
    case 2:
      return <path d="M5 0.3 9.7 5 5 9.7 0.3 5Z" />;
    case 3:
      return <path d="M0.5 8.5a4.5 4.5 0 0 1 9 0Z" />;
    case 4:
      return <path d="M5 0.5 9.5 9H0.5Z" />;
    default:
      return (
        <>
          <circle cx="5" cy="2.4" r="2.2" />
          <circle cx="5" cy="7.6" r="2.2" />
          <circle cx="2.4" cy="5" r="2.2" />
          <circle cx="7.6" cy="5" r="2.2" />
        </>
      );
  }
}
