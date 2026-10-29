"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { isValidDate } from "@/lib/dates";
import { supabaseAdmin } from "@/lib/supabase";
import { cleanTitle, isTime, isUuid } from "@/lib/validate";

function fail(message: string): never {
  throw new Error(message);
}

// time은 'HH:MM' 또는 빈 값(시간 없음)
function parseTime(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (!isTime(value)) fail("시간 형식이 올바르지 않습니다.");
  return value;
}

export async function addSchedule(date: string, time: string, title: string) {
  await requireAuth();
  const clean = cleanTitle(title);
  if (!isValidDate(date) || !clean) fail("잘못된 입력입니다.");
  const { error } = await supabaseAdmin()
    .from("schedules")
    .insert({ date, time: parseTime(time), title: clean });
  if (error) fail(error.message);
  revalidatePath("/schedule");
}

export async function toggleSchedule(id: string, done: boolean) {
  await requireAuth();
  if (!isUuid(id) || typeof done !== "boolean") fail("잘못된 입력입니다.");
  const { error } = await supabaseAdmin().from("schedules").update({ done }).eq("id", id);
  if (error) fail(error.message);
  revalidatePath("/schedule");
  revalidatePath("/calendar");
  revalidatePath("/");
}

export async function deleteSchedule(id: string) {
  await requireAuth();
  if (!isUuid(id)) fail("잘못된 입력입니다.");
  const { error } = await supabaseAdmin().from("schedules").delete().eq("id", id);
  if (error) fail(error.message);
  revalidatePath("/schedule");
}
