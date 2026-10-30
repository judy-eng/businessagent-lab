import { todayIn, weekdayOf, addDays } from "@/lib/dates";
import type { TimeSlot } from "@/lib/time-slot";

// 최소 표본 기준 (기획안 4번)
export const MIN_EMOTION_SAMPLES = 4; // 요일마다, 시간대마다 감정 기록 4개 이상
export const MIN_ROUTINE_DAYS = 7; // 카테고리의 루틴이 적용된 날 7일 이상

export type SampleStat = {
  n: number; // 표본 수 (같은 시간대에 여러 번 기록한 것도 모두 센다)
  average: number | null; // 기준을 채웠을 때만 값이 있다
  enough: boolean;
};

function stat(scores: number[], min: number): SampleStat {
  const n = scores.length;
  const enough = n >= min;
  return { n, enough, average: enough ? scores.reduce((a, b) => a + b, 0) / n : null };
}

// 요일별 감정 평균. 결과는 월~일 순서이고, 각 항목의 weekday는 0(일)~6(토)
export function weekdayEmotionStats(entries: { date: string; score: number }[]) {
  const order = [1, 2, 3, 4, 5, 6, 0];
  return order.map((weekday) => ({
    weekday,
    ...stat(entries.filter((e) => weekdayOf(e.date) === weekday).map((e) => e.score), MIN_EMOTION_SAMPLES),
  }));
}

export const SLOT_ORDER: TimeSlot[] = ["morning", "afternoon", "evening", "late_night"];

// 시간대별 감정 평균 (아침, 오후, 저녁, 심야/새벽)
export function slotEmotionStats(entries: { slot: TimeSlot; score: number }[]) {
  return SLOT_ORDER.map((slot) => ({
    slot,
    ...stat(entries.filter((e) => e.slot === slot).map((e) => e.score), MIN_EMOTION_SAMPLES),
  }));
}

export type RoutineForStats = {
  id: string;
  category_id: string | null;
  repeat_days: number[];
  active: boolean;
  created_at: string;
};

export type CategoryRoutineStat = {
  id: string | null;
  name: string;
  days: number; // 이 카테고리의 루틴이 적용된 날 수 (표본)
  scheduled: number; // 하기로 한 횟수 (루틴 수 × 날)
  done: number;
  rate: number | null; // 기준을 채웠을 때만 값이 있다
  enough: boolean;
};

// 카테고리별 루틴 달성률. 범위 안에서 오늘까지, 하기로 한 날만 센다.
// 하기로 한 날: 활성 루틴이 반복 요일에 해당하고 만든 날 이후이거나, 그날 수행 기록이 있는 경우.
export function routineCategoryStats(
  routines: RoutineForStats[],
  categories: { id: string; name: string }[],
  logs: { routine_id: string; date: string; done: boolean }[],
  rangeStart: string,
  today: string,
  timeZone: string,
): CategoryRoutineStat[] {
  const logged = new Map(logs.map((l) => [`${l.routine_id}|${l.date}`, l.done]));
  const groups: { id: string | null; name: string }[] = [
    ...categories,
    { id: null, name: "카테고리 없음" },
  ];
  const known = new Set(categories.map((c) => c.id));

  const result: CategoryRoutineStat[] = [];
  for (const g of groups) {
    const mine = routines.filter((r) =>
      g.id === null ? r.category_id === null || !known.has(r.category_id) : r.category_id === g.id,
    );
    if (mine.length === 0) continue;

    const days = new Set<string>();
    let scheduled = 0;
    let done = 0;
    for (const r of mine) {
      const createdOn = todayIn(timeZone, new Date(r.created_at));
      for (let day = rangeStart; day <= today; day = addDays(day, 1)) {
        const key = `${r.id}|${day}`;
        const isScheduled = logged.has(key) || (r.active && r.repeat_days.includes(weekdayOf(day)) && createdOn <= day);
        if (!isScheduled) continue;
        days.add(day);
        scheduled += 1;
        if (logged.get(key)) done += 1;
      }
    }
    if (scheduled === 0) continue;
    const enough = days.size >= MIN_ROUTINE_DAYS;
    result.push({
      id: g.id,
      name: g.name,
      days: days.size,
      scheduled,
      done,
      enough,
      rate: enough ? done / scheduled : null,
    });
  }
  return result;
}

// ---- 통계 화면의 배경 사진: 그 기간의 감정 점수 평균에 따라 다르다 ----

export type Mood = "positive" | "neutral" | "negative";

// 점수는 0(가장 나쁨)~10(가장 좋음). 5를 가운데로 보고 4 미만은 부정, 6 초과는 긍정, 그 사이는 중립이다.
export const MOOD_NEGATIVE_BELOW = 4;
export const MOOD_POSITIVE_ABOVE = 6;

export function moodOfAverage(average: number): Mood {
  if (average < MOOD_NEGATIVE_BELOW) return "negative";
  if (average > MOOD_POSITIVE_ABOVE) return "positive";
  return "neutral";
}

export const MOOD_PHOTOS: Record<Mood, string> = {
  positive: "/ui/stats-positive.jpg",
  neutral: "/ui/stats-neutral.jpg",
  negative: "/ui/stats-negative.jpg",
};
