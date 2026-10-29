import "server-only";
import { connection } from "next/server";
import { getAppUser } from "@/lib/auth";
import { addDays, isValidDate, todayIn, weekdayOf } from "@/lib/dates";
import { GROUP_ORDER, type EmotionGroup, type EmotionType } from "@/lib/emotion";
import { supabaseAdmin } from "@/lib/supabase";
import type { TimeSlot } from "@/lib/time-slot";

export type Todo = {
  id: string;
  date: string;
  title: string;
  done: boolean;
  sort_order: number;
};

export type Category = { id: string; name: string };

export type Routine = {
  id: string;
  name: string;
  category_id: string | null;
  repeat_days: number[];
  active: boolean;
  created_at: string;
};

export type ChecklistRoutine = Routine & { done: boolean };

export type Schedule = {
  id: string;
  date: string;
  time: string | null; // 'HH:MM:SS'
  title: string;
  done: boolean;
};

function check<T>(result: { data: T | null; error: { message: string } | null }, what: string) {
  if (result.error) throw new Error(`${what} 조회 실패: ${result.error.message}`);
  return result.data as T;
}

export async function getTimezone() {
  const user = await getAppUser();
  return user?.timezone ?? "Asia/Seoul";
}

// 화면에서 보고 있는 날짜: ?date= 값이 올바르면 그 날짜, 아니면 오늘
export async function resolveDate(requested: string | undefined) {
  await connection();
  const timeZone = await getTimezone();
  const today = todayIn(timeZone);
  const date = isValidDate(requested) ? requested : today;
  return { date, today, timeZone };
}

export async function getTodos(date: string) {
  const result = await supabaseAdmin()
    .from("todos")
    .select("id, date, title, done, sort_order")
    .eq("date", date)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  return check<Todo[]>(result, "Todo");
}

export async function getCategories() {
  const result = await supabaseAdmin()
    .from("routine_categories")
    .select("id, name")
    .order("created_at", { ascending: true });
  return check<Category[]>(result, "루틴 카테고리");
}

export async function getRoutines() {
  const result = await supabaseAdmin()
    .from("routines")
    .select("id, name, category_id, repeat_days, active, created_at")
    .order("created_at", { ascending: true });
  return check<Routine[]>(result, "루틴");
}

// 그 날짜에 체크할 루틴: 사용 중이고, 반복 요일에 해당하고, 만든 날 이후인 것.
// 이미 그 날짜에 수행 기록이 있는 루틴은 (나중에 중단했더라도) 계속 보여준다.
export async function getRoutineChecklist(date: string, timeZone: string) {
  const [routines, logsResult] = await Promise.all([
    getRoutines(),
    supabaseAdmin()
      .from("routine_logs")
      .select("routine_id, done")
      .eq("date", date),
  ]);
  const logs = check<{ routine_id: string; done: boolean }[]>(
    logsResult,
    "루틴 수행 기록",
  );
  const logged = new Map(logs.map((l) => [l.routine_id, l.done]));
  const weekday = weekdayOf(date);

  return routines
    .filter((r) => {
      if (logged.has(r.id)) return true;
      const createdOn = todayIn(timeZone, new Date(r.created_at));
      return r.active && r.repeat_days.includes(weekday) && createdOn <= date;
    })
    .map((r) => ({ ...r, done: logged.get(r.id) ?? false }));
}

export async function getSchedules(date: string) {
  const result = await supabaseAdmin()
    .from("schedules")
    .select("id, date, time, title, done")
    .eq("date", date)
    .order("time", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  return check<Schedule[]>(result, "일정");
}

export async function getDiary(date: string) {
  const result = await supabaseAdmin()
    .from("diary_entries")
    .select("content")
    .eq("date", date)
    .maybeSingle();
  return check<{ content: string } | null>(result, "일기")?.content ?? "";
}

export type EmotionEntry = {
  id: string;
  recorded_at: string;
  time_slot: TimeSlot;
  score: number;
  cause: string | null;
  typeIds: number[];
};

type EmotionTypeRow = {
  id: number;
  name: string;
  grp: EmotionType["grp"];
  sort_order: number;
  is_custom: boolean;
  hidden: boolean;
};

// 버블 판에는 숨기지 않은 감정만, 기록 목록에는 includeHidden으로 숨긴 감정(지난 기록에 쓰인 것)까지 쓴다.
export async function getEmotionTypes({ includeHidden = false } = {}) {
  const db = supabaseAdmin();
  const select = (columns: string) =>
    db.from("emotion_types").select(columns).order("sort_order", { ascending: true });

  const rows = check<EmotionTypeRow[]>(
    (await select("id, name, grp, sort_order, is_custom, hidden")) as unknown as {
      data: EmotionTypeRow[] | null;
      error: { message: string } | null;
    },
    "감정 종류",
  );
  // 같은 그룹(색)끼리 모아서 보여준다. 직접 추가한 감정은 그 그룹의 맨 뒤에 온다.
  return rows
    .filter((r) => includeHidden || !r.hidden)
    .sort(
      (a, b) =>
        GROUP_ORDER.indexOf(a.grp) - GROUP_ORDER.indexOf(b.grp) ||
        a.sort_order - b.sort_order,
    )
    .map<EmotionType>((r) => ({
      id: r.id,
      name: r.name,
      grp: r.grp,
      isCustom: r.is_custom,
    }));
}

type EmotionRow = {
  id: string;
  recorded_at: string;
  time_slot: TimeSlot;
  score: number;
  cause?: string | null;
  emotion_entry_types: { type_id: number }[];
};

export async function getEmotionEntries(date: string) {
  const db = supabaseAdmin();
  const select = (columns: string) =>
    db
      .from("emotion_entries")
      .select(`${columns}, emotion_entry_types(type_id)`)
      .eq("date", date)
      .order("recorded_at", { ascending: true });

  const rows = check<EmotionRow[]>(
    (await select("id, recorded_at, time_slot, score, cause")) as unknown as {
      data: EmotionRow[] | null;
      error: { message: string } | null;
    },
    "감정 기록",
  );
  return rows.map<EmotionEntry>((r) => ({
    id: r.id,
    recorded_at: r.recorded_at,
    time_slot: r.time_slot,
    score: r.score,
    cause: r.cause ?? null,
    typeIds: r.emotion_entry_types.map((t) => t.type_id),
  }));
}

// 캘린더 날짜 칸에 그릴 감정 도형 정보: 날짜별로, 기록한 감정 하나가 도형 하나다.
// 감정 종류 없이 점수만 기록한 경우에는 점수만 담은 항목(typeId: null)이 하나 생긴다.
export type DayEmotionMark = { entryId: string; typeId: number | null; score: number };

export async function getEmotionMarks(startDate: string, endDate: string) {
  const result = await supabaseAdmin()
    .from("emotion_entries")
    .select("id, date, score, recorded_at, emotion_entry_types(type_id)")
    .gte("date", startDate)
    .lte("date", endDate)
    .order("recorded_at", { ascending: true });
  const rows = check<
    { id: string; date: string; score: number; emotion_entry_types: { type_id: number }[] }[]
  >(result, "감정 기록");

  const byDate = new Map<string, DayEmotionMark[]>();
  for (const row of rows) {
    const marks = byDate.get(row.date) ?? [];
    if (row.emotion_entry_types.length === 0) {
      marks.push({ entryId: row.id, typeId: null, score: row.score });
    } else {
      for (const t of row.emotion_entry_types) {
        marks.push({ entryId: row.id, typeId: t.type_id, score: row.score });
      }
    }
    byDate.set(row.date, marks);
  }
  return byDate;
}

// 날짜별 한 줄 메모 (홈)
export async function getDayMemo(date: string) {
  const result = await supabaseAdmin()
    .from("day_memos")
    .select("memo")
    .eq("date", date)
    .maybeSingle();
  return check<{ memo: string } | null>(result, "한 줄 메모")?.memo ?? "";
}

// ---- 한 줄 메모 모아보기 ----

export type DayMemo = { date: string; memo: string };

export async function getMemos(limit = 400) {
  const result = await supabaseAdmin()
    .from("day_memos")
    .select("date, memo")
    .order("date", { ascending: false })
    .limit(limit);
  return check<DayMemo[]>(result, "한 줄 메모");
}

// ---- 캘린더의 월 요약 ----

export type MonthSummary = {
  emotion: {
    entries: number; // 감정을 기록한 횟수
    days: number; // 감정을 기록한 날 수
    average: number | null; // 점수 평균
    groups: Record<EmotionGroup, number>; // 고른 감정 종류의 그룹별 개수
  };
  todo: { done: number; total: number };
  routine: { done: number; total: number }; // total: 오늘까지 반복 요일에 해당했던 루틴 횟수
  schedule: { done: number; total: number };
};

// 한 달(첫 날~마지막 날)의 요약. 루틴 달성률은 오늘까지의 날만 센다.
export async function getMonthSummary(
  monthStart: string,
  monthEnd: string,
  today: string,
  timeZone: string,
): Promise<MonthSummary> {
  const db = supabaseAdmin();
  const [entries, types, todos, schedules, routines, logs] = await Promise.all([
    db
      .from("emotion_entries")
      .select("date, score, emotion_entry_types(type_id)")
      .gte("date", monthStart)
      .lte("date", monthEnd),
    getEmotionTypes({ includeHidden: true }),
    db.from("todos").select("done").gte("date", monthStart).lte("date", monthEnd),
    db.from("schedules").select("done").gte("date", monthStart).lte("date", monthEnd),
    getRoutines(),
    db
      .from("routine_logs")
      .select("routine_id, date, done")
      .gte("date", monthStart)
      .lte("date", monthEnd),
  ]);
  const entryRows = check<
    { date: string; score: number; emotion_entry_types: { type_id: number }[] }[]
  >(entries, "감정 기록");
  const todoRows = check<{ done: boolean }[]>(todos, "Todo");
  const scheduleRows = check<{ done: boolean }[]>(schedules, "일정");
  const logRows = check<{ routine_id: string; date: string; done: boolean }[]>(
    logs,
    "루틴 수행 기록",
  );

  const groupOf = new Map(types.map((t) => [t.id, t.grp]));
  const groups: Record<EmotionGroup, number> = { positive: 0, neutral: 0, negative: 0 };
  for (const e of entryRows) {
    for (const t of e.emotion_entry_types) {
      const g = groupOf.get(t.type_id);
      if (g) groups[g] += 1;
    }
  }
  const scoreSum = entryRows.reduce((sum, e) => sum + e.score, 0);

  // 루틴: 오늘까지, 그 요일에 하기로 한 루틴의 수와 그중 체크한 수
  const logged = new Map(logRows.map((l) => [`${l.routine_id}|${l.date}`, l.done]));
  let routineTotal = 0;
  let routineDone = 0;
  const lastDay = monthEnd < today ? monthEnd : today;
  for (let day = monthStart; day <= lastDay; day = addDays(day, 1)) {
    const weekday = weekdayOf(day);
    for (const r of routines) {
      const key = `${r.id}|${day}`;
      const createdOn = todayIn(timeZone, new Date(r.created_at));
      const scheduled = logged.has(key) || (r.active && r.repeat_days.includes(weekday) && createdOn <= day);
      if (!scheduled) continue;
      routineTotal += 1;
      if (logged.get(key)) routineDone += 1;
    }
  }

  return {
    emotion: {
      entries: entryRows.length,
      days: new Set(entryRows.map((e) => e.date)).size,
      average: entryRows.length ? scoreSum / entryRows.length : null,
      groups,
    },
    todo: { done: todoRows.filter((t) => t.done).length, total: todoRows.length },
    routine: { done: routineDone, total: routineTotal },
    schedule: { done: scheduleRows.filter((t) => t.done).length, total: scheduleRows.length },
  };
}

// ---- 해빗트래커 ----

// done: 체크함 / missed: 하기로 한 날이 지났는데 체크 안 함 / pending: 오늘이거나 앞으로 할 날 / off: 하기로 하지 않은 날
export type HabitStatus = "done" | "missed" | "pending" | "off";

export type HabitRow = {
  id: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  active: boolean;
  days: { date: string; status: HabitStatus }[];
  streak: number; // 지금까지 이어진 연속 달성 (하기로 한 날 기준)
  best: number; // 가장 길었던 연속 달성
};

const STREAK_LOOKBACK_DAYS = 400;

// 수행 기록을 1000개씩 나눠서 모두 가져온다 (한 번에 가져올 수 있는 수에 제한이 있다)
async function getRoutineLogsBetween(from: string, to: string) {
  const db = supabaseAdmin();
  const rows: { routine_id: string; date: string; done: boolean }[] = [];
  for (let offset = 0; ; offset += 1000) {
    const result = await db
      .from("routine_logs")
      .select("routine_id, date, done")
      .gte("date", from)
      .lte("date", to)
      .order("date", { ascending: true })
      .range(offset, offset + 999);
    const page = check<{ routine_id: string; date: string; done: boolean }[]>(result, "루틴 수행 기록");
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

// 한 달의 루틴별 달성 현황. 연속 기록은 달이 바뀌어도 이어서 센다.
export async function getHabitTracker(
  monthStart: string,
  monthEnd: string,
  today: string,
  timeZone: string,
): Promise<HabitRow[]> {
  const lookbackStart = addDays(today, -STREAK_LOOKBACK_DAYS);
  const from = monthStart < lookbackStart ? monthStart : lookbackStart;
  const to = monthEnd > today ? monthEnd : today;

  const [routines, categories, logs] = await Promise.all([
    getRoutines(),
    getCategories(),
    getRoutineLogsBetween(from, to),
  ]);
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const logged = new Map(logs.map((l) => [`${l.routine_id}|${l.date}`, l.done]));

  const rows: HabitRow[] = [];
  for (const r of routines) {
    const createdOn = todayIn(timeZone, new Date(r.created_at));
    // 하기로 한 날: 반복 요일에 해당하고 만든 날 이후인 활성 루틴, 또는 그날 수행 기록이 있는 경우
    const scheduled = (day: string) =>
      logged.has(`${r.id}|${day}`) ||
      (r.active && r.repeat_days.includes(weekdayOf(day)) && createdOn <= day);
    const doneOn = (day: string) => logged.get(`${r.id}|${day}`) === true;

    const days: HabitRow["days"] = [];
    for (let day = monthStart; day <= monthEnd; day = addDays(day, 1)) {
      let status: HabitStatus = "off";
      if (scheduled(day)) status = doneOn(day) ? "done" : day < today ? "missed" : "pending";
      days.push({ date: day, status });
    }
    // 이 달에 하기로 한 날이 하루도 없으면 보여주지 않는다
    if (days.every((d) => d.status === "off")) continue;

    // 현재 연속: 오늘부터 거꾸로, 하기로 한 날만 보고 체크한 날이 이어진 만큼.
    // 오늘 아직 체크하지 않은 것은 연속을 끊지 않는다.
    const earliest = createdOn > lookbackStart ? createdOn : lookbackStart;
    let streak = 0;
    for (let day = today; day >= earliest; day = addDays(day, -1)) {
      if (!scheduled(day)) continue;
      if (doneOn(day)) streak += 1;
      else if (day === today) continue;
      else break;
    }
    // 최장 연속: 처음부터 오늘까지 한 번 훑는다
    let best = 0;
    let run = 0;
    for (let day = earliest; day <= today; day = addDays(day, 1)) {
      if (!scheduled(day)) continue;
      if (doneOn(day)) {
        run += 1;
        if (run > best) best = run;
      } else if (day < today) run = 0;
    }

    rows.push({
      id: r.id,
      name: r.name,
      categoryId: r.category_id,
      categoryName: r.category_id ? (categoryName.get(r.category_id) ?? null) : null,
      active: r.active,
      days,
      streak,
      best,
    });
  }
  return rows;
}
