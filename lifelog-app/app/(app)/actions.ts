"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { isValidDate } from "@/lib/dates";
import { MEMO_MAX_LENGTH } from "@/lib/memo";
import { supabaseAdmin } from "@/lib/supabase";

export type MemoState = { saved?: boolean; error?: string } | undefined;

// 홈의 '한 줄 메모'를 저장한다. 비워서 저장하면 메모를 지운다.
export async function saveDayMemo(
  date: string,
  _prev: MemoState,
  formData: FormData,
): Promise<MemoState> {
  await requireAuth();
  if (!isValidDate(date)) return { error: "잘못된 날짜입니다." };
  // 한 줄이므로 줄바꿈은 공백으로 바꾼다
  const memo = String(formData.get("memo") ?? "").replace(/\s*[\r\n]+\s*/g, " ").trim();
  if (memo.length > MEMO_MAX_LENGTH) {
    return { error: `메모는 ${MEMO_MAX_LENGTH}자까지 쓸 수 있어요.` };
  }

  const db = supabaseAdmin();
  const { error } = memo
    ? await db.from("day_memos").upsert({ date, memo }, { onConflict: "date" })
    : await db.from("day_memos").delete().eq("date", date);
  if (error) return { error: "저장하지 못했습니다. 잠시 후 다시 시도해주세요." };

  revalidatePath("/");
  revalidatePath("/memos");
  revalidatePath("/calendar");
  return { saved: true };
}

// 한 줄 메모 하나를 지운다. (한 줄 탭의 삭제 버튼)
export async function deleteDayMemo(formData: FormData) {
  await requireAuth();
  const date = formData.get("date");
  if (!isValidDate(date)) throw new Error("잘못된 날짜입니다.");
  const { error } = await supabaseAdmin().from("day_memos").delete().eq("date", date);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/memos");
  revalidatePath("/calendar");
}
