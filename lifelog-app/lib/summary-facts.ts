import "server-only";
import { addDays, todayIn, weekOfMonth, weekdayOf } from "@/lib/dates";
import { GROUP_COLORS, type EmotionGroup } from "@/lib/emotion";
import type { DailyFacts, WeeklyFacts } from "@/lib/summary-text";
import {
  getCategories,
  getEmotionEntries,
  getEmotionTypes,
  getRoutineChecklist,
  getRoutineLogsBetween,
  getRoutines,
  getSchedules,
  getTodos,
} from "@/lib/queries";
import { SLOT_LABELS, type TimeSlot } from "@/lib/time-slot";
import { supabaseAdmin } from "@/lib/supabase";

const WEEKDAY_FULL = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
const WEEKDAY_SHORT = ["일", "월", "화", "수", "목", "금", "토"];

// ---- 하루 ----

// 그날의 숫자만 모은다. Todo·일정·루틴의 이름과 일기, 한 줄, 감정의 원인 글은 읽지도 않는다. (요약은 숫자로만 만든다)
export async function gatherDailyFacts(date: string, today: string, timeZone: string): Promise<DailyFacts> {
  const [todos, schedules, routines, entries, types, categories] = await Promise.all([
    getTodos(date),
    getSchedules(date),
    getRoutineChecklist(date, timeZone),
    getEmotionEntries(date),
    getEmotionTypes({ includeHidden: true }),
    getCategories(),
  ]);
  const count = (items: { done: boolean }[]) => ({ done: items.filter((i) => i.done).length, total: items.length });
  const typeName = new Map(types.map((t) => [t.id, t.name]));

  const byCategory = categories
    .map((c) => {
      const mine = routines.filter((r) => r.category_id === c.id);
      return { name: c.name, ...count(mine) };
    })
    .filter((c) => c.total > 0);

  return {
    date,
    weekday: WEEKDAY_FULL[weekdayOf(date)],
    isToday: date === today,
    todo: count(todos),
    schedule: count(schedules),
    routine: count(routines),
    routineByCategory: byCategory,
    emotions: entries.map((e) => ({
      slot: SLOT_LABELS[e.time_slot],
      score: e.score,
      names: e.typeIds.map((id) => typeName.get(id)).filter((n): n is string => !!n),
    })),
  };
}

export function dailyHasData(f: DailyFacts) {
  return f.todo.total + f.schedule.total + f.routine.total + f.emotions.length > 0;
}

// ---- 한 주 ----

type DayAgg = {
  date: string;
  todo: { done: number; total: number };
  schedule: { done: number; total: number };
  routine: { done: number; total: number };
  scores: number[];
  typeIds: number[];
  slotScores: { slot: TimeSlot; score: number }[];
};

async function aggregateRange(start: string, end: string, today: string, timeZone: string): Promise<DayAgg[]> {
  const db = supabaseAdmin();
  const [todos, schedules, entries, routines, logs] = await Promise.all([
    db.from("todos").select("date, done").gte("date", start).lte("date", end).limit(5000),
    db.from("schedules").select("date, done").gte("date", start).lte("date", end).limit(5000),
    db
      .from("emotion_entries")
      .select("date, score, time_slot, emotion_entry_types(type_id)")
      .gte("date", start)
      .lte("date", end)
      .limit(5000),
    getRoutines(),
    getRoutineLogsBetween(start, end),
  ]);
  for (const r of [todos, schedules, entries]) if (r.error) throw new Error(`요약용 기록 조회 실패: ${r.error.message}`);

  const logged = new Map(logs.map((l) => [`${l.routine_id}|${l.date}`, l.done]));
  const days: DayAgg[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const todo = (todos.data ?? []).filter((t) => t.date === d);
    const schedule = (schedules.data ?? []).filter((t) => t.date === d);
    const dayEntries = (entries.data ?? []).filter((e) => e.date === d);
    // 루틴: 오늘까지, 하기로 한 루틴(반복 요일이거나 그날 수행 기록이 있는 것)
    let routineTotal = 0;
    let routineDone = 0;
    if (d <= today) {
      for (const r of routines) {
        const key = `${r.id}|${d}`;
        const createdOn = todayIn(timeZone, new Date(r.created_at));
        const scheduled = logged.has(key) || (r.active && r.repeat_days.includes(weekdayOf(d)) && createdOn <= d);
        if (!scheduled) continue;
        routineTotal += 1;
        if (logged.get(key)) routineDone += 1;
      }
    }
    days.push({
      date: d,
      todo: { done: todo.filter((t) => t.done).length, total: todo.length },
      schedule: { done: schedule.filter((t) => t.done).length, total: schedule.length },
      routine: { done: routineDone, total: routineTotal },
      scores: dayEntries.map((e) => e.score),
      typeIds: dayEntries.flatMap((e) => e.emotion_entry_types.map((t) => t.type_id)),
      slotScores: dayEntries.map((e) => ({ slot: e.time_slot as TimeSlot, score: e.score })),
    });
  }
  return days;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : null);
const rate = (done: number, total: number) => (total ? Math.round((done / total) * 100) : null);

export async function gatherWeeklyFacts(weekStart: string, today: string, timeZone: string): Promise<WeeklyFacts> {
  const end = addDays(weekStart, 6);
  const prevStart = addDays(weekStart, -7);
  const [days, prevDays, types] = await Promise.all([
    aggregateRange(weekStart, end, today, timeZone),
    aggregateRange(prevStart, addDays(prevStart, 6), today, timeZone),
    getEmotionTypes({ includeHidden: true }),
  ]);
  const typeById = new Map(types.map((t) => [t.id, t]));

  const allScores = days.flatMap((d) => d.scores);
  const groups: Record<EmotionGroup, number> = { positive: 0, neutral: 0, negative: 0 };
  const counts = new Map<number, number>();
  for (const d of days) {
    for (const id of d.typeIds) {
      const t = typeById.get(id);
      if (!t) continue;
      groups[t.grp] += 1;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({ name: typeById.get(id)!.name, group: GROUP_COLORS[typeById.get(id)!.grp].label, count }));

  const slotOrder: TimeSlot[] = ["morning", "afternoon", "evening", "late_night"];
  const allSlots = days.flatMap((d) => d.slotScores);
  const bySlot = slotOrder.map((slot) => {
    const scores = allSlots.filter((s) => s.slot === slot).map((s) => s.score);
    return { slot: SLOT_LABELS[slot], count: scores.length, average: mean(scores) };
  });

  const prevScores = prevDays.flatMap((d) => d.scores);
  const prevHas = prevDays.some((d) => d.todo.total + d.schedule.total + d.routine.total + d.scores.length > 0);
  const totalOf = (list: DayAgg[], k: "todo" | "routine") => ({
    done: sum(list.map((d) => d[k].done)),
    total: sum(list.map((d) => d[k].total)),
  });
  const pt = totalOf(prevDays, "todo");
  const pr = totalOf(prevDays, "routine");

  return {
    label: weekOfMonth(weekStart).text,
    start: weekStart,
    end,
    days: days.map((d) => ({
      date: d.date,
      weekday: WEEKDAY_SHORT[weekdayOf(d.date)],
      todo: d.todo,
      schedule: d.schedule,
      routine: d.routine,
      emotionCount: d.scores.length,
      emotionAverage: mean(d.scores),
    })),
    emotion: { entries: allScores.length, average: mean(allScores), groups, top, bySlot },
    previous: prevHas
      ? { todoRate: rate(pt.done, pt.total), routineRate: rate(pr.done, pr.total), emotionAverage: mean(prevScores), emotionCount: prevScores.length }
      : null,
  };
}

export function weeklyHasData(f: WeeklyFacts) {
  return f.days.some((d) => d.todo.total + d.schedule.total + d.routine.total + d.emotionCount > 0);
}
