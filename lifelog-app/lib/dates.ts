import { localDateAndSlot } from "@/lib/time-slot";

// 날짜는 'YYYY-MM-DD' 문자열로 다룬다. (사용자 시간대 기준 달력상 날짜)
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function toUtc(date: string) {
  return new Date(`${date}T00:00:00Z`);
}

export function addDays(date: string, days: number) {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// 0(일) ~ 6(토)
export function weekdayOf(date: string) {
  return toUtc(date).getUTCDay();
}

export const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

export function formatKorean(date: string) {
  const d = toUtc(date);
  return `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${WEEKDAY_LABELS[d.getUTCDay()]})`;
}

export function todayIn(timeZone: string, now = new Date()) {
  return localDateAndSlot(now, timeZone).date;
}
