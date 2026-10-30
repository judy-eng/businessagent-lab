import "server-only";
import { addDays, todayIn } from "@/lib/dates";
import { type EmotionGroup } from "@/lib/emotion";
import {
  getCategories,
  getEmotionTypes,
  getRoutineLogsBetween,
  getRoutines,
} from "@/lib/queries";
import {
  routineCategoryStats,
  slotEmotionStats,
  weekdayEmotionStats,
} from "@/lib/stats-calc";
import { supabaseAdmin } from "@/lib/supabase";
import type { TimeSlot } from "@/lib/time-slot";

export type PeriodEmotion = {
  entries: number; // 감정을 기록한 횟수
  average: number | null; // 점수 평균
  groups: Record<EmotionGroup, number>; // 고른 감정의 그룹별 개수
  scoreOnly: number; // 감정 종류 없이 점수만 기록한 횟수
};

// 화면 배경과 요약에 쓰는, 보고 있는 기간(오늘/주/월)의 감정 기록
export async function getPeriodEmotion(start: string, end: string): Promise<PeriodEmotion> {
  const db = supabaseAdmin();
  const [entries, types] = await Promise.all([
    db
      .from("emotion_entries")
      .select("score, emotion_entry_types(type_id)")
      .gte("date", start)
      .lte("date", end)
      .limit(1000),
    getEmotionTypes({ includeHidden: true }),
  ]);
  if (entries.error) throw new Error(`감정 기록 조회 실패: ${entries.error.message}`);
  const groupOf = new Map(types.map((t) => [t.id, t.grp]));
  const groups: Record<EmotionGroup, number> = { positive: 0, neutral: 0, negative: 0 };
  let sum = 0;
  let scoreOnly = 0;
  for (const e of entries.data) {
    sum += e.score;
    if (e.emotion_entry_types.length === 0) scoreOnly += 1;
    for (const t of e.emotion_entry_types) {
      const g = groupOf.get(t.type_id);
      if (g) groups[g] += 1;
    }
  }
  return {
    entries: entries.data.length,
    average: entries.data.length ? sum / entries.data.length : null,
    groups,
    scoreOnly,
  };
}

export type StatsRange = "4w" | "12w" | "all";
const ALL_LOOKBACK_DAYS = 800; // 전체 기간도 너무 오래 거슬러 올라가지는 않는다

async function emotionRows(start: string, end: string) {
  const db = supabaseAdmin();
  const rows: { date: string; score: number; time_slot: TimeSlot }[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db
      .from("emotion_entries")
      .select("date, score, time_slot")
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: true })
      .range(offset, offset + 999);
    if (error) throw new Error(`감정 기록 조회 실패: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

// 분석 범위(최근 4주, 12주, 전체)의 기본 통계: 요일별 감정, 시간대별 감정, 카테고리별 루틴 달성률
export async function getStats(range: StatsRange, today: string, timeZone: string) {
  let start: string;
  if (range === "4w") start = addDays(today, -27);
  else if (range === "12w") start = addDays(today, -83);
  else {
    // 전체: 가장 이른 기록부터 (최대 ALL_LOOKBACK_DAYS일 전까지)
    const db = supabaseAdmin();
    const [firstEntry, firstLog, routines] = await Promise.all([
      db.from("emotion_entries").select("date").order("date", { ascending: true }).limit(1),
      db.from("routine_logs").select("date").order("date", { ascending: true }).limit(1),
      getRoutines(),
    ]);
    const candidates = [
      firstEntry.data?.[0]?.date,
      firstLog.data?.[0]?.date,
      ...routines.map((r) => todayIn(timeZone, new Date(r.created_at))),
    ].filter((d): d is string => !!d);
    const earliest = candidates.length ? candidates.reduce((a, b) => (a < b ? a : b)) : today;
    const floor = addDays(today, -ALL_LOOKBACK_DAYS);
    start = earliest < floor ? floor : earliest;
  }

  const [entries, routines, categories, logs] = await Promise.all([
    emotionRows(start, today),
    getRoutines(),
    getCategories(),
    getRoutineLogsBetween(start, today),
  ]);

  return {
    start,
    totalEntries: entries.length,
    weekday: weekdayEmotionStats(entries),
    slot: slotEmotionStats(entries.map((e) => ({ slot: e.time_slot, score: e.score }))),
    routine: routineCategoryStats(routines, categories, logs, start, today, timeZone),
  };
}
