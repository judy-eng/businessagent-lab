import "server-only";
import { connection } from "next/server";
import { getAppUser } from "@/lib/auth";
import { isValidDate, todayIn, weekdayOf } from "@/lib/dates";
import { GROUP_ORDER, type EmotionType } from "@/lib/emotion";
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
  hidden?: boolean;
};

// 버블 판에는 숨기지 않은 감정만, 기록 목록에는 includeHidden으로 숨긴 감정(지난 기록에 쓰인 것)까지 쓴다.
export async function getEmotionTypes({ includeHidden = false } = {}) {
  const db = supabaseAdmin();
  const select = (columns: string) =>
    db.from("emotion_types").select(columns).order("sort_order", { ascending: true });

  let result = await select("id, name, grp, sort_order, is_custom, hidden");
  // 42703: 열이 없음 (0005_emotion_hidden.sql 실행 전). 실행이 끝나면 이 재시도는 지워도 된다.
  if (result.error?.code === "42703") {
    result = await select("id, name, grp, sort_order, is_custom");
  }
  const rows = check<EmotionTypeRow[]>(
    result as unknown as { data: EmotionTypeRow[] | null; error: { message: string } | null },
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
