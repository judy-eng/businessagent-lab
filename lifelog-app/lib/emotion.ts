export type EmotionGroup = "positive" | "neutral" | "negative";

export type EmotionType = {
  id: number;
  name: string;
  grp: EmotionGroup;
  isCustom?: boolean; // 사용자가 직접 추가한 감정
};

// 감정 버블 색 (기획안 10번): 긍정 Leaf Skin, 중립·복합 Muted Violet, 부정 Electric Crimson
export const GROUP_COLORS: Record<
  EmotionGroup,
  { label: string; bg: string; text: string }
> = {
  positive: { label: "긍정", bg: "#A6B8A0", text: "#1f2d1b" },
  neutral: { label: "중립·복합", bg: "#8B729C", text: "#ffffff" },
  negative: { label: "부정", bg: "#E20942", text: "#ffffff" },
};

export const NEGATIVE_COLOR = GROUP_COLORS.negative.bg;
export const NEUTRAL_COLOR = GROUP_COLORS.neutral.bg;
export const POSITIVE_COLOR = GROUP_COLORS.positive.bg;

// 점수(0 가장 나쁨 ~ 10 가장 좋음)에 맞는 색: 부정 → 중립 → 긍정
export function scoreColor(score: number) {
  if (score <= 5) {
    return `color-mix(in srgb, ${NEGATIVE_COLOR}, ${NEUTRAL_COLOR} ${(score / 5) * 100}%)`;
  }
  return `color-mix(in srgb, ${NEUTRAL_COLOR}, ${POSITIVE_COLOR} ${((score - 5) / 5) * 100}%)`;
}

// 직접 추가하는 감정 이름의 최대 길이
export const CUSTOM_EMOTION_NAME_MAX = 12;

export const GROUP_ORDER: EmotionGroup[] = ["positive", "neutral", "negative"];

export function isEmotionGroup(value: unknown): value is EmotionGroup {
  return value === "positive" || value === "neutral" || value === "negative";
}
