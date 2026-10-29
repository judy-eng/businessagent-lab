"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { isValidDate } from "@/lib/dates";
import { supabaseAdmin } from "@/lib/supabase";
import { cleanTitle, isUuid } from "@/lib/validate";

function fail(message: string): never {
  throw new Error(message);
}

export async function addTodo(date: string, title: string) {
  await requireAuth();
  const clean = cleanTitle(title);
  if (!isValidDate(date) || !clean) fail("잘못된 입력입니다.");

  const db = supabaseAdmin();
  // 새 Todo는 그 날짜의 맨 아래에 추가한다.
  const last = await db
    .from("todos")
    .select("sort_order")
    .eq("date", date)
    .order("sort_order", { ascending: false })
    .limit(1);
  if (last.error) fail(last.error.message);
  const next = (last.data?.[0]?.sort_order ?? -1) + 1;

  const { error } = await db
    .from("todos")
    .insert({ date, title: clean, sort_order: next });
  if (error) fail(error.message);
  revalidatePath("/todo");
}

export async function toggleTodo(id: string, done: boolean) {
  await requireAuth();
  if (!isUuid(id) || typeof done !== "boolean") fail("잘못된 입력입니다.");
  const { error } = await supabaseAdmin().from("todos").update({ done }).eq("id", id);
  if (error) fail(error.message);
  revalidatePath("/todo");
}

export async function renameTodo(id: string, title: string) {
  await requireAuth();
  const clean = cleanTitle(title);
  if (!isUuid(id) || !clean) fail("잘못된 입력입니다.");
  const { error } = await supabaseAdmin()
    .from("todos")
    .update({ title: clean })
    .eq("id", id);
  if (error) fail(error.message);
  revalidatePath("/todo");
}

export async function deleteTodo(id: string) {
  await requireAuth();
  if (!isUuid(id)) fail("잘못된 입력입니다.");
  const { error } = await supabaseAdmin().from("todos").delete().eq("id", id);
  if (error) fail(error.message);
  revalidatePath("/todo");
}

// 드래그로 바꾼 순서를 저장한다. 순서는 날짜별로 따로 관리한다.
export async function reorderTodos(date: string, orderedIds: string[]) {
  await requireAuth();
  if (
    !isValidDate(date) ||
    !Array.isArray(orderedIds) ||
    orderedIds.length > 500 ||
    !orderedIds.every(isUuid)
  ) {
    fail("잘못된 입력입니다.");
  }
  const db = supabaseAdmin();
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      db.from("todos").update({ sort_order: index }).eq("id", id).eq("date", date),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) fail(failed.error.message);
  revalidatePath("/todo");
}
