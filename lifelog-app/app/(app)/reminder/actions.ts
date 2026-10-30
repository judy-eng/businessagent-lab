"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { sendToAll } from "@/lib/push";
import { answerCarryover, type CarryoverResult } from "@/lib/reminder";
import { supabaseAdmin } from "@/lib/supabase";

// "다음 날에 하시겠습니까?"에 답한다 (앱 안의 질문 창)
export async function answerCarryoverAction(date: string, answer: "yes" | "no"): Promise<CarryoverResult> {
  await requireAuth();
  const result = await answerCarryover(date, answer);
  if (result.ok) {
    revalidatePath("/");
    revalidatePath("/todo");
    revalidatePath("/calendar");
  }
  return result;
}

export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

const B64URL = /^[A-Za-z0-9_-]{8,200}={0,2}$/;

function validSubscription(sub: unknown): sub is PushSubscriptionInput {
  if (!sub || typeof sub !== "object") return false;
  const s = sub as Partial<PushSubscriptionInput>;
  return (
    typeof s.endpoint === "string" &&
    s.endpoint.length <= 1000 &&
    s.endpoint.startsWith("https://") &&
    !!s.keys &&
    typeof s.keys.p256dh === "string" &&
    typeof s.keys.auth === "string" &&
    B64URL.test(s.keys.p256dh) &&
    B64URL.test(s.keys.auth)
  );
}

// 이 브라우저의 알림을 켠다: 알림을 보낼 주소(구독 정보)를 저장한다
export async function saveSubscription(sub: PushSubscriptionInput) {
  await requireAuth();
  if (!validSubscription(sub)) throw new Error("잘못된 알림 정보입니다.");
  const { error } = await supabaseAdmin()
    .from("push_subscriptions")
    .upsert(
      { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      { onConflict: "endpoint" },
    );
  if (error) throw new Error(error.message);
}

export async function removeSubscription(endpoint: string) {
  await requireAuth();
  if (typeof endpoint !== "string" || endpoint.length > 1000) throw new Error("잘못된 알림 정보입니다.");
  const { error } = await supabaseAdmin().from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) throw new Error(error.message);
}

// 알림이 잘 오는지 지금 바로 보내 본다
export async function sendTestPush() {
  await requireAuth();
  return sendToAll({
    title: "라이프로그",
    body: "알림이 잘 오고 있어요. 매일 오후 11:30에 미완료 Todo가 있으면 알려드릴게요.",
    tag: "lifelog-test",
    url: "/",
  });
}
