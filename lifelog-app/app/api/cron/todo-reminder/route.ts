import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { localDateAndSlot, isCarryoverTime } from "@/lib/time-slot";
import { getTimezone } from "@/lib/queries";
import { carryoverPayload, listSubscriptions, sendToAll } from "@/lib/push";
import { getIncompleteTodos, getReminderLog, markReminderSent } from "@/lib/reminder";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) return false;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// 정해진 시각마다(예: 1분마다) 이 길을 부르면, 오후 11:30 이후에 미완료 Todo가 있을 때 하루에 한 번만 알림을 보낸다.
// ?dryRun=1 은 보내지 않고 상황만 알려주고, ?force=1 은 시각과 이미 보냈는지를 무시한다 (시험용).
async function handle(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";
  const dryRun = url.searchParams.get("dryRun") === "1";

  const now = new Date();
  const timeZone = await getTimezone();
  const { date } = localDateAndSlot(now, timeZone);
  if (!force && !isCarryoverTime(now, timeZone)) {
    return NextResponse.json({ sent: false, reason: "not-in-window", date });
  }

  const incomplete = (await getIncompleteTodos(date)).length;
  if (incomplete === 0) return NextResponse.json({ sent: false, reason: "no-incomplete", date });

  const log = await getReminderLog(date);
  if (!force && log?.answer) return NextResponse.json({ sent: false, reason: "already-answered", date });
  if (!force && log?.sent_at) return NextResponse.json({ sent: false, reason: "already-sent", date });

  const subscriptions = (await listSubscriptions()).length;
  if (subscriptions === 0) return NextResponse.json({ sent: false, reason: "no-subscriptions", date, incomplete });
  if (dryRun) return NextResponse.json({ sent: false, dryRun: true, wouldSend: subscriptions, incomplete, date });

  const result = await sendToAll(carryoverPayload(date));
  // 한 곳에도 못 보냈으면 기록하지 않아서 다음 호출 때 다시 시도한다
  if (result.delivered > 0) await markReminderSent(date);
  return NextResponse.json({ sent: result.delivered > 0, ...result, incomplete, date });
}

export const GET = handle;
export const POST = handle;
