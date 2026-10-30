"use server";

import { requireAuth } from "@/lib/auth";
import { addDays, isValidDate, weekdayOf } from "@/lib/dates";
import { resolveDate } from "@/lib/queries";
import {
  dailyHasData,
  gatherDailyFacts,
  gatherWeeklyFacts,
  weeklyHasData,
} from "@/lib/summary-facts";
import { dailySummaryText, weeklySummaryText } from "@/lib/summary-text";

export type SummaryResult = { ok: true; text: string } | { ok: false; error: string };

const MAX_AGE_DAYS = 800;

type DateCheck = { ok: false; error: string } | { ok: true; today: string; timeZone: string };

async function checkDate(date: unknown, requireMonday = false): Promise<DateCheck> {
  if (!isValidDate(date)) return { ok: false, error: "잘못된 날짜입니다." };
  if (requireMonday && weekdayOf(date) !== 1) return { ok: false, error: "주의 시작은 월요일이어야 해요." };
  const { today, timeZone } = await resolveDate(undefined);
  if (date > today) return { ok: false, error: "아직 오지 않은 날은 요약할 수 없어요." };
  if (date < addDays(today, -MAX_AGE_DAYS)) return { ok: false, error: "너무 오래된 날짜예요." };
  return { ok: true, today, timeZone };
}

// 그날의 숫자로 문장을 만든다. AI를 쓰지 않아서 무료이고 항상 같은 결과가 나온다.
export async function makeDailySummary(date: string): Promise<SummaryResult> {
  await requireAuth();
  const ctx = await checkDate(date);
  if (!ctx.ok) return { ok: false, error: ctx.error };
  try {
    const facts = await gatherDailyFacts(date, ctx.today, ctx.timeZone);
    if (!dailyHasData(facts)) return { ok: false, error: "요약할 기록이 아직 없어요." };
    return { ok: true, text: dailySummaryText(facts) };
  } catch {
    return { ok: false, error: "요약을 만들지 못했어요. 잠시 후 다시 시도해주세요." };
  }
}

// 한 주(월~일)의 숫자로 문장을 만든다. 지난주와 비교한 숫자도 함께 말한다.
export async function makeWeeklySummary(weekStart: string): Promise<SummaryResult> {
  await requireAuth();
  const ctx = await checkDate(weekStart, true);
  if (!ctx.ok) return { ok: false, error: ctx.error };
  try {
    const facts = await gatherWeeklyFacts(weekStart, ctx.today, ctx.timeZone);
    if (!weeklyHasData(facts)) return { ok: false, error: "요약할 기록이 아직 없어요." };
    return { ok: true, text: weeklySummaryText(facts) };
  } catch {
    return { ok: false, error: "요약을 만들지 못했어요. 잠시 후 다시 시도해주세요." };
  }
}
