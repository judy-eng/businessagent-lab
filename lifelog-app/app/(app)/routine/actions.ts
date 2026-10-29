"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { isValidDate } from "@/lib/dates";
import { supabaseAdmin } from "@/lib/supabase";
import { cleanTitle, isUuid } from "@/lib/validate";

function fail(message: string): never {
  throw new Error(message);
}

function parseDays(formData: FormData) {
  const days = [...new Set(formData.getAll("days").map((v) => Number(v)))]
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    .sort();
  if (days.length === 0) fail("반복 요일을 하나 이상 골라주세요.");
  return days;
}

function parseCategoryId(formData: FormData) {
  const value = formData.get("categoryId");
  if (value === null || value === "") return null;
  if (!isUuid(value)) fail("잘못된 입력입니다.");
  return value;
}

// ---- 날짜별 수행 기록 ----

export async function toggleRoutineLog(routineId: string, date: string, done: boolean) {
  await requireAuth();
  if (!isUuid(routineId) || !isValidDate(date) || typeof done !== "boolean") {
    fail("잘못된 입력입니다.");
  }
  const { error } = await supabaseAdmin()
    .from("routine_logs")
    .upsert({ routine_id: routineId, date, done }, { onConflict: "routine_id,date" });
  if (error) fail(error.message);
  revalidatePath("/routine");
  revalidatePath("/calendar");
}

// ---- 루틴 정의 ----

export async function createRoutine(formData: FormData) {
  await requireAuth();
  const name = cleanTitle(formData.get("name"), 100);
  if (!name) fail("루틴 이름을 입력해주세요.");
  const { error } = await supabaseAdmin().from("routines").insert({
    name,
    category_id: parseCategoryId(formData),
    repeat_days: parseDays(formData),
  });
  if (error) fail(error.message);
  revalidatePath("/routine");
}

export async function updateRoutine(formData: FormData) {
  await requireAuth();
  const id = formData.get("id");
  const name = cleanTitle(formData.get("name"), 100);
  if (!isUuid(id) || !name) fail("잘못된 입력입니다.");
  const { error } = await supabaseAdmin()
    .from("routines")
    .update({
      name,
      category_id: parseCategoryId(formData),
      repeat_days: parseDays(formData),
    })
    .eq("id", id);
  if (error) fail(error.message);
  revalidatePath("/routine");
}

export async function setRoutineActive(formData: FormData) {
  await requireAuth();
  const id = formData.get("id");
  if (!isUuid(id)) fail("잘못된 입력입니다.");
  const active = formData.get("active") === "true";
  const { error } = await supabaseAdmin().from("routines").update({ active }).eq("id", id);
  if (error) fail(error.message);
  revalidatePath("/routine");
}

export async function deleteRoutine(formData: FormData) {
  await requireAuth();
  const id = formData.get("id");
  if (!isUuid(id)) fail("잘못된 입력입니다.");
  // 수행 기록도 함께 삭제된다 (DB의 cascade). 기록을 남기려면 삭제 대신 '중단'을 쓴다.
  const { error } = await supabaseAdmin().from("routines").delete().eq("id", id);
  if (error) fail(error.message);
  revalidatePath("/routine");
}

// ---- 카테고리 ----

export async function createCategory(formData: FormData) {
  await requireAuth();
  const name = cleanTitle(formData.get("name"), 50);
  if (!name) return;
  const { error } = await supabaseAdmin().from("routine_categories").insert({ name });
  // 같은 이름이 이미 있으면(23505) 조용히 넘어간다.
  if (error && error.code !== "23505") fail(error.message);
  revalidatePath("/routine");
}

export async function deleteCategory(formData: FormData) {
  await requireAuth();
  const id = formData.get("id");
  if (!isUuid(id)) fail("잘못된 입력입니다.");
  // 이 카테고리의 루틴은 '카테고리 없음'이 된다 (DB의 set null).
  const { error } = await supabaseAdmin().from("routine_categories").delete().eq("id", id);
  if (error) fail(error.message);
  revalidatePath("/routine");
}
