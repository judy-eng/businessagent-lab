import type { EmotionGroup } from "@/lib/emotion";
import type { DayEmotionMark } from "@/lib/queries";

export type CalendarView = "month" | "week";
// shapes: 감정 도형으로 보기 / heat: 그날 감정 점수의 색으로 칸을 채워 보기
export type CalendarMode = "shapes" | "heat";

export type CalendarOpts = {
  view: CalendarView;
  date: string;
  mode: CalendarMode;
  filter: string | null; // "positive" | "neutral" | "negative" | "e:<감정 번호>"
};

export function parseFilter(value: string | undefined): string | null {
  if (value === "positive" || value === "neutral" || value === "negative") return value;
  if (value && /^e:\d{1,5}$/.test(value)) return value;
  return null;
}

// 주소를 만든다. 기본값(월간, 도형, 필터 없음)은 주소에서 생략한다.
export function calendarHref(opts: CalendarOpts, overrides: Partial<CalendarOpts> = {}) {
  const o = { ...opts, ...overrides };
  const params = new URLSearchParams();
  if (o.view !== "month") params.set("view", o.view);
  params.set("date", o.date);
  if (o.mode !== "shapes") params.set("mode", o.mode);
  if (o.filter) params.set("f", o.filter);
  return `/calendar?${params.toString()}`;
}

// 필터에 맞는 감정 기록인지
export function markMatches(
  mark: DayEmotionMark,
  filter: string | null,
  groupOf: Map<number, EmotionGroup>,
) {
  if (!filter || mark.typeId === null) return false;
  if (filter.startsWith("e:")) return mark.typeId === Number(filter.slice(2));
  return groupOf.get(mark.typeId) === filter;
}

// 하루의 감정 점수 평균 (같은 기록에서 고른 감정이 여러 개여도 한 번만 센다)
export function dayAverage(marks: DayEmotionMark[] | undefined) {
  if (!marks || marks.length === 0) return null;
  const byEntry = new Map(marks.map((m) => [m.entryId, m.score]));
  const scores = [...byEntry.values()];
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}
