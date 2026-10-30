import "server-only";
import { addDays, isValidDate, todayIn } from "@/lib/dates";
import { getTimezone } from "@/lib/queries";
import { supabaseAdmin } from "@/lib/supabase";

export type ReminderLog = { sent_at: string | null; answer: "yes" | "no" | null };

export async function getReminderLog(date: string): Promise<ReminderLog | null> {
  const { data, error } = await supabaseAdmin()
    .from("reminder_log")
    .select("sent_at, answer")
    .eq("date", date)
    .eq("kind", "todo_carryover")
    .maybeSingle();
  if (error) throw new Error(`알림 기록 조회 실패: ${error.message}`);
  return data;
}

export async function getIncompleteTodos(date: string) {
  const { data, error } = await supabaseAdmin()
    .from("todos")
    .select("id, title, sort_order")
    .eq("date", date)
    .eq("done", false)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Todo 조회 실패: ${error.message}`);
  return data;
}

export async function markReminderSent(date: string) {
  const { error } = await supabaseAdmin()
    .from("reminder_log")
    .upsert({ date, kind: "todo_carryover", sent_at: new Date().toISOString() }, { onConflict: "date,kind" });
  if (error) throw new Error(`알림 기록 저장 실패: ${error.message}`);
}

export type CarryoverResult = { ok: true; moved: number } | { ok: false; error: string };

// "다음 날에 하시겠습니까?"에 대한 답을 처리한다.
// - yes: 그 날의 미완료 Todo를 다음 날 Todo로 옮긴다 (다음 날 목록의 맨 뒤에 원래 순서대로)
// - no: 아무것도 지우거나 옮기지 않고, 그 날의 Todo에 체크되지 않은 채로 남긴다
// 오늘이나 어제 날짜만 처리한다. (알림을 늦게 눌러도 되도록 어제까지 허용)
export async function answerCarryover(date: string, answer: "yes" | "no"): Promise<CarryoverResult> {
  if (!isValidDate(date) || (answer !== "yes" && answer !== "no")) return { ok: false, error: "잘못된 요청입니다." };
  const today = todayIn(await getTimezone());
  if (date !== today && date !== addDays(today, -1)) return { ok: false, error: "오늘이나 어제의 Todo만 처리할 수 있어요." };

  const db = supabaseAdmin();
  let moved = 0;
  if (answer === "yes") {
    const target = addDays(date, 1);
    const todos = await getIncompleteTodos(date);
    if (todos.length > 0) {
      const last = await db
        .from("todos")
        .select("sort_order")
        .eq("date", target)
        .order("sort_order", { ascending: false })
        .limit(1);
      if (last.error) return { ok: false, error: "저장하지 못했습니다." };
      const base = (last.data?.[0]?.sort_order ?? -1) + 1;
      const results = await Promise.all(
        todos.map((t, i) =>
          // done=false인 것만 옮긴다 (그 사이에 완료한 것은 그대로 둔다)
          db.from("todos").update({ date: target, sort_order: base + i }).eq("id", t.id).eq("done", false),
        ),
      );
      if (results.some((r) => r.error)) return { ok: false, error: "저장하지 못했습니다." };
      moved = todos.length;
    }
  }

  const { error } = await db
    .from("reminder_log")
    .upsert(
      { date, kind: "todo_carryover", answer, answered_at: new Date().toISOString() },
      { onConflict: "date,kind" },
    );
  if (error) return { ok: false, error: "저장하지 못했습니다." };
  return { ok: true, moved };
}
