"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { isValidDate } from "@/lib/dates";
import { supabaseAdmin } from "@/lib/supabase";

export type DiaryState = { saved?: boolean; error?: string } | undefined;

const MAX_LENGTH = 20000;

export async function saveDiary(
  date: string,
  _prev: DiaryState,
  formData: FormData,
): Promise<DiaryState> {
  await requireAuth();
  const content = String(formData.get("content") ?? "");
  if (!isValidDate(date)) return { error: "잘못된 날짜입니다." };
  if (content.length > MAX_LENGTH) {
    return { error: `일기는 ${MAX_LENGTH.toLocaleString()}자까지 쓸 수 있어요.` };
  }

  // 내용을 모두 지우면 그 날의 일기도 지운다.
  const db = supabaseAdmin();
  const { error } = content.trim()
    ? await db
        .from("diary_entries")
        .upsert(
          { date, content, updated_at: new Date().toISOString() },
          { onConflict: "date" },
        )
    : await db.from("diary_entries").delete().eq("date", date);
  if (error) return { error: "저장하지 못했습니다. 잠시 후 다시 시도해주세요." };

  revalidatePath("/diary");
  return { saved: true };
}
