import "server-only";
import { getCategories } from "@/lib/queries";
import { escapeLike } from "@/lib/search-text";
import { supabaseAdmin } from "@/lib/supabase";
import type { TimeSlot } from "@/lib/time-slot";

export const SEARCH_KINDS = ["emotion", "todo", "schedule", "diary", "memo", "routine"] as const;
export type SearchKind = (typeof SEARCH_KINDS)[number];

export const SEARCH_QUERY_MAX = 50;
const PER_SOURCE_LIMIT = 200;
const TOTAL_LIMIT = 300;

export type EmotionHit = {
  kind: "emotion";
  date: string;
  entryId: string;
  recordedAt: string;
  slot: TimeSlot;
  score: number;
  typeIds: number[];
  matchedTypeIds: number[]; // 검색어와 이름이 맞는 감정
  cause: string | null;
  causeMatched: boolean;
};
export type TextHit =
  | { kind: "todo"; date: string; text: string; done: boolean }
  | { kind: "schedule"; date: string; text: string; done: boolean; time: string | null }
  | { kind: "diary"; date: string; text: string }
  | { kind: "memo"; date: string; text: string };
export type Hit = EmotionHit | TextHit;

export type RoutineHit = {
  id: string;
  name: string;
  categoryName: string | null;
  repeatDays: number[];
  active: boolean;
  doneDays: number;
  lastDone: string | null;
};

export type SearchResults = {
  hits: Hit[]; // 날짜 내림차순
  routines: RoutineHit[];
  counts: Record<SearchKind, number>; // 종류별 개수 (종류 필터를 적용하기 전)
  capped: boolean; // 너무 많아서 일부만 보여주는지
};

function must<T>(result: { data: T | null; error: { message: string } | null }, what: string) {
  if (result.error) throw new Error(`${what} 검색 실패: ${result.error.message}`);
  return result.data as T;
}

const KIND_ORDER: Record<SearchKind, number> = { emotion: 0, todo: 1, schedule: 2, diary: 3, memo: 4, routine: 5 };

// 일상 기록, 감정(이름과 원인), 일정, Todo, 한 줄 메모, 루틴을 한 번에 찾는다.
// 감정 이름을 검색하면 그 감정을 고른 날이 나온다. 삭제해서 숨긴 감정의 이름도 지난 기록에서 찾는다.
export async function searchAll(rawQuery: string): Promise<SearchResults> {
  const q = rawQuery.trim().slice(0, SEARCH_QUERY_MAX);
  const empty: SearchResults = {
    hits: [],
    routines: [],
    counts: { emotion: 0, todo: 0, schedule: 0, diary: 0, memo: 0, routine: 0 },
    capped: false,
  };
  if (!q) return empty;

  const like = `%${escapeLike(q)}%`;
  const db = supabaseAdmin();

  const [diary, memos, todos, schedules, typeRows, byCause, routineRows, categories] = await Promise.all([
    db.from("diary_entries").select("date, content").ilike("content", like).order("date", { ascending: false }).limit(PER_SOURCE_LIMIT),
    db.from("day_memos").select("date, memo").ilike("memo", like).order("date", { ascending: false }).limit(PER_SOURCE_LIMIT),
    db.from("todos").select("date, title, done").ilike("title", like).order("date", { ascending: false }).limit(PER_SOURCE_LIMIT),
    db.from("schedules").select("date, time, title, done").ilike("title", like).order("date", { ascending: false }).limit(PER_SOURCE_LIMIT),
    db.from("emotion_types").select("id").ilike("name", like),
    db
      .from("emotion_entries")
      .select("id, date, score, time_slot, recorded_at, cause, emotion_entry_types(type_id)")
      .ilike("cause", like)
      .order("date", { ascending: false })
      .limit(PER_SOURCE_LIMIT),
    db.from("routines").select("id, name, category_id, repeat_days, active").ilike("name", like).order("created_at", { ascending: true }).limit(20),
    getCategories(),
  ]);

  const hits: Hit[] = [];
  for (const r of must<{ date: string; content: string }[]>(diary, "일기")) hits.push({ kind: "diary", date: r.date, text: r.content });
  for (const r of must<{ date: string; memo: string }[]>(memos, "한 줄")) hits.push({ kind: "memo", date: r.date, text: r.memo });
  for (const r of must<{ date: string; title: string; done: boolean }[]>(todos, "Todo")) hits.push({ kind: "todo", date: r.date, text: r.title, done: r.done });
  for (const r of must<{ date: string; time: string | null; title: string; done: boolean }[]>(schedules, "일정")) {
    hits.push({ kind: "schedule", date: r.date, text: r.title, done: r.done, time: r.time });
  }

  // ---- 감정: 이름이 맞는 감정을 고른 기록 + 원인 글이 맞는 기록 ----
  type EntryRow = {
    id: string;
    date: string;
    score: number;
    time_slot: TimeSlot;
    recorded_at: string;
    cause: string | null;
    emotion_entry_types: { type_id: number }[];
  };
  const matchedTypeIds = must<{ id: number }[]>(typeRows, "감정 종류").map((t) => t.id);
  const entries = new Map<string, EntryRow>();
  for (const e of must<EntryRow[]>(byCause, "감정 원인")) entries.set(e.id, e);

  if (matchedTypeIds.length > 0) {
    const byType = await db
      .from("emotion_entries")
      .select("id, date, score, time_slot, recorded_at, cause, emotion_entry_types!inner(type_id)")
      .in("emotion_entry_types.type_id", matchedTypeIds)
      .order("date", { ascending: false })
      .limit(PER_SOURCE_LIMIT);
    for (const e of must<EntryRow[]>(byType, "감정")) if (!entries.has(e.id)) entries.set(e.id, e);
  }

  // 찾은 기록에서 고른 감정을 모두 가져온다 (위의 조인은 일치한 것만 담고 있다)
  const entryIds = [...entries.keys()];
  const typesByEntry = new Map<string, number[]>();
  if (entryIds.length > 0) {
    const all = await db.from("emotion_entry_types").select("entry_id, type_id").in("entry_id", entryIds);
    for (const row of must<{ entry_id: string; type_id: number }[]>(all, "감정 종류")) {
      typesByEntry.set(row.entry_id, [...(typesByEntry.get(row.entry_id) ?? []), row.type_id]);
    }
  }
  const matchedSet = new Set(matchedTypeIds);
  const needle = q.toLowerCase();
  for (const e of entries.values()) {
    const typeIds = typesByEntry.get(e.id) ?? [];
    hits.push({
      kind: "emotion",
      date: e.date,
      entryId: e.id,
      recordedAt: e.recorded_at,
      slot: e.time_slot,
      score: e.score,
      typeIds,
      matchedTypeIds: typeIds.filter((id) => matchedSet.has(id)),
      cause: e.cause,
      causeMatched: !!e.cause && e.cause.toLowerCase().includes(needle),
    });
  }

  // ---- 루틴: 이름이 맞는 루틴과 완료한 날 수 ----
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const routineList = must<{ id: string; name: string; category_id: string | null; repeat_days: number[]; active: boolean }[]>(routineRows, "루틴");
  const routines: RoutineHit[] = await Promise.all(
    routineList.map(async (r) => {
      const [count, last] = await Promise.all([
        db.from("routine_logs").select("*", { count: "exact", head: true }).eq("routine_id", r.id).eq("done", true),
        db.from("routine_logs").select("date").eq("routine_id", r.id).eq("done", true).order("date", { ascending: false }).limit(1),
      ]);
      return {
        id: r.id,
        name: r.name,
        categoryName: r.category_id ? (categoryName.get(r.category_id) ?? null) : null,
        repeatDays: r.repeat_days,
        active: r.active,
        doneDays: count.count ?? 0,
        lastDone: must<{ date: string }[]>(last, "루틴 기록")[0]?.date ?? null,
      };
    }),
  );

  const counts = { emotion: 0, todo: 0, schedule: 0, diary: 0, memo: 0, routine: routines.length } as Record<SearchKind, number>;
  for (const h of hits) counts[h.kind] += 1;

  hits.sort((a, b) => (a.date === b.date ? KIND_ORDER[a.kind] - KIND_ORDER[b.kind] : a.date < b.date ? 1 : -1));
  const capped = hits.length > TOTAL_LIMIT || Object.values(counts).some((n) => n >= PER_SOURCE_LIMIT);
  return { hits: hits.slice(0, TOTAL_LIMIT), routines, counts, capped };
}
