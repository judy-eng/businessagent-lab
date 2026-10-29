"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { CUSTOM_EMOTION_NAME_MAX, isEmotionGroup } from "@/lib/emotion";
import { getTimezone } from "@/lib/queries";
import { supabaseAdmin } from "@/lib/supabase";
import { localDateAndSlot } from "@/lib/time-slot";
import { isUuid } from "@/lib/validate";

function fail(message: string): never {
  throw new Error(message);
}

const CAUSE_MAX_LENGTH = 2000;

// 지금 이 순간의 감정을 기록한다.
// 날짜와 시간대는 입력한 시각을 사용자 시간대로 바꿔서 자동으로 정한다.
// (자정 직후 기록은 달력상 당일 날짜, 시간대는 심야/새벽)
export async function addEmotion(score: number, typeIds: number[], cause: string) {
  await requireAuth();
  if (!Number.isInteger(score) || score < 0 || score > 10) fail("잘못된 점수입니다.");
  if (
    !Array.isArray(typeIds) ||
    typeIds.length > 500 ||
    !typeIds.every((id) => Number.isInteger(id) && id >= 1 && id <= 32767)
  ) {
    fail("잘못된 감정 종류입니다.");
  }
  const uniqueTypeIds = [...new Set(typeIds)];
  if (uniqueTypeIds.length > 0) {
    // 직접 추가한 감정도 있으므로, 실제로 있는 감정인지 DB에서 확인한다.
    const db = supabaseAdmin();
    const found = await db.from("emotion_types").select("id").in("id", uniqueTypeIds);
    if (found.error || found.data.length !== uniqueTypeIds.length) {
      fail("잘못된 감정 종류입니다.");
    }
    // 삭제해서 숨긴 감정은 새 기록에 쓸 수 없다.
    const hidden = await db
      .from("emotion_types")
      .select("id")
      .in("id", uniqueTypeIds)
      .eq("hidden", true);
    if (hidden.error) fail(hidden.error.message);
    if (hidden.data.length > 0) fail("삭제된 감정입니다.");
  }
  if (typeof cause !== "string" || cause.length > CAUSE_MAX_LENGTH) {
    fail("감정의 원인이 너무 깁니다.");
  }
  const trimmedCause = cause.trim();

  const now = new Date();
  const { date, timeSlot } = localDateAndSlot(now, await getTimezone());

  const db = supabaseAdmin();
  const created = await db
    .from("emotion_entries")
    .insert({
      recorded_at: now.toISOString(),
      date,
      time_slot: timeSlot,
      score,
      // 원인을 적지 않았으면 비워 둔다
      ...(trimmedCause ? { cause: trimmedCause } : {}),
    })
    .select("id")
    .single();
  if (created.error) fail(created.error.message);

  if (uniqueTypeIds.length > 0) {
    const { error } = await db.from("emotion_entry_types").insert(
      uniqueTypeIds.map((type_id) => ({ entry_id: created.data.id, type_id })),
    );
    if (error) {
      // 종류 저장에 실패하면 점수만 남지 않도록 기록 전체를 되돌린다.
      await db.from("emotion_entries").delete().eq("id", created.data.id);
      fail(error.message);
    }
  }
  revalidatePath("/emotion");
  revalidatePath("/");
  revalidatePath("/calendar");
}

export async function deleteEmotion(formData: FormData) {
  await requireAuth();
  const id = formData.get("id");
  if (!isUuid(id)) fail("잘못된 입력입니다.");
  // 선택한 감정 종류도 함께 지워진다 (DB의 cascade)
  const { error } = await supabaseAdmin().from("emotion_entries").delete().eq("id", id);
  if (error) fail(error.message);
  revalidatePath("/emotion");
  revalidatePath("/");
  revalidatePath("/calendar");
}

export type CreateEmotionState = { ok: true } | { ok: false; error: string };

// 사용자가 원하는 감정을 직접 추가한다. (카테고리 3개 중 하나 + 이름)
export async function createEmotionType(
  grp: string,
  name: string,
): Promise<CreateEmotionState> {
  await requireAuth();
  if (!isEmotionGroup(grp)) return { ok: false, error: "카테고리를 골라주세요." };
  const clean = typeof name === "string" ? name.trim().replace(/\s+/g, " ") : "";
  if (!clean) return { ok: false, error: "감정 이름을 입력해주세요." };
  if (clean.length > CUSTOM_EMOTION_NAME_MAX) {
    return { ok: false, error: `감정 이름은 ${CUSTOM_EMOTION_NAME_MAX}자까지 쓸 수 있어요.` };
  }

  const db = supabaseAdmin();
  // 그 카테고리 안에서 맨 뒤에 놓는다.
  const last = await db
    .from("emotion_types")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  if (last.error) return { ok: false, error: "저장하지 못했습니다. 잠시 후 다시 시도해주세요." };
  const sortOrder = (last.data?.[0]?.sort_order ?? 0) + 1;

  const { error } = await db
    .from("emotion_types")
    .insert({ name: clean, grp, sort_order: sortOrder, is_custom: true });
  if (error?.code === "23505") {
    // 같은 이름이 있다. 전에 삭제해서 숨겨 둔 내 감정이면 다시 꺼내 쓴다.
    const same = await db
      .from("emotion_types")
      .select("id, is_custom, hidden")
      .eq("name", clean)
      .maybeSingle();
    if (!same.error && same.data?.is_custom && same.data.hidden) {
      const { error: revive } = await db
        .from("emotion_types")
        .update({ hidden: false, grp, sort_order: sortOrder })
        .eq("id", same.data.id);
      if (!revive) {
        revalidatePath("/emotion");
        return { ok: true };
      }
    }
    return { ok: false, error: "이미 있는 감정이에요." };
  }
  if (error) return { ok: false, error: "저장하지 못했습니다. 잠시 후 다시 시도해주세요." };

  revalidatePath("/emotion");
  return { ok: true };
}

const SAVE_ERROR = "저장하지 못했습니다. 잠시 후 다시 시도해주세요.";

// 직접 추가한 감정인지 확인한다. 기본 70개는 고치거나 지울 수 없다.
async function findCustomEmotion(id: number) {
  if (!Number.isInteger(id) || id < 1 || id > 32767) return null;
  const { data, error } = await supabaseAdmin()
    .from("emotion_types")
    .select("id, is_custom")
    .eq("id", id)
    .maybeSingle();
  return !error && data?.is_custom ? data : null;
}

export async function renameEmotionType(id: number, name: string): Promise<CreateEmotionState> {
  await requireAuth();
  const clean = typeof name === "string" ? name.trim().replace(/\s+/g, " ") : "";
  if (!clean) return { ok: false, error: "감정 이름을 입력해주세요." };
  if (clean.length > CUSTOM_EMOTION_NAME_MAX) {
    return { ok: false, error: `감정 이름은 ${CUSTOM_EMOTION_NAME_MAX}자까지 쓸 수 있어요.` };
  }
  if (!(await findCustomEmotion(id))) {
    return { ok: false, error: "직접 추가한 감정만 고칠 수 있어요." };
  }
  const { error } = await supabaseAdmin().from("emotion_types").update({ name: clean }).eq("id", id);
  if (error?.code === "23505") return { ok: false, error: "이미 있는 감정이에요." };
  if (error) return { ok: false, error: SAVE_ERROR };
  revalidatePath("/emotion");
  return { ok: true };
}

// 기록에 한 번도 쓰이지 않은 감정은 완전히 지우고,
// 지난 기록에 쓰인 감정은 버블 판에서만 숨겨서 지난 기록의 이름을 남긴다.
export async function deleteEmotionType(id: number): Promise<CreateEmotionState> {
  await requireAuth();
  if (!(await findCustomEmotion(id))) {
    return { ok: false, error: "직접 추가한 감정만 지울 수 있어요." };
  }
  const db = supabaseAdmin();
  const used = await db
    .from("emotion_entry_types")
    .select("*", { count: "exact", head: true })
    .eq("type_id", id);
  if (used.error) return { ok: false, error: SAVE_ERROR };

  const { error } =
    (used.count ?? 0) === 0
      ? await db.from("emotion_types").delete().eq("id", id)
      : await db.from("emotion_types").update({ hidden: true }).eq("id", id);
  if (error) return { ok: false, error: SAVE_ERROR };
  revalidatePath("/emotion");
  return { ok: true };
}
