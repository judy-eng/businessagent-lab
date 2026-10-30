import "server-only";
import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabase";

export type PushPayload = {
  title: string;
  body: string;
  tag: string;
  url: string;
  data?: Record<string, unknown>;
  actions?: { action: string; title: string }[];
};

let configured = false;
function configure() {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    throw new Error("VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT 가 .env.local 에 필요합니다.");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export function vapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY ?? "";
}

export async function listSubscriptions() {
  const { data, error } = await supabaseAdmin()
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth");
  if (error) throw new Error(`알림 구독 조회 실패: ${error.message}`);
  return data;
}

// 저장된 모든 브라우저에 알림을 보낸다. 더 이상 쓸 수 없는 구독(404/410)은 지운다.
export async function sendToAll(payload: PushPayload) {
  configure();
  const subs = await listSubscriptions();
  let delivered = 0;
  const gone: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 }, // 한 시간 안에 못 받으면 버린다
        );
        delivered += 1;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) gone.push(s.id);
      }
    }),
  );
  if (gone.length > 0) await supabaseAdmin().from("push_subscriptions").delete().in("id", gone);
  return { subscriptions: subs.length, delivered, removed: gone.length };
}

export const CARRYOVER_TITLE = "라이프로그";
export const CARRYOVER_BODY = "미완료 todo 가 남아있습니다. 다음 날에 하시겠습니까?";

export function carryoverPayload(date: string): PushPayload {
  return {
    title: CARRYOVER_TITLE,
    body: CARRYOVER_BODY,
    tag: `todo-carryover-${date}`,
    url: "/?carryover=1",
    data: { kind: "todo_carryover", date },
    actions: [
      { action: "yes", title: "예, 내일 할게요" },
      { action: "no", title: "아니오" },
    ],
  };
}
