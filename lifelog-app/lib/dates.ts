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

// ---- 캘린더용 ----

export const WEEKDAY_LABELS_MON_FIRST = ["월", "화", "수", "목", "금", "토", "일"] as const;

// 그 날짜가 속한 주의 월요일
export function mondayOf(date: string) {
  const offset = (weekdayOf(date) + 6) % 7;
  return addDays(date, -offset);
}

export function startOfMonth(date: string) {
  return `${date.slice(0, 7)}-01`;
}

export function endOfMonth(date: string) {
  const d = toUtc(startOfMonth(date));
  d.setUTCMonth(d.getUTCMonth() + 1, 0);
  return d.toISOString().slice(0, 10);
}

// 달을 옮긴다. 도착한 달에 같은 날이 없으면(31일 → 30일 등) 그 달의 마지막 날로 맞춘다.
export function addMonths(date: string, months: number) {
  const d = toUtc(startOfMonth(date));
  d.setUTCMonth(d.getUTCMonth() + months);
  const first = d.toISOString().slice(0, 10);
  const day = Math.min(Number(date.slice(8, 10)), Number(endOfMonth(first).slice(8, 10)));
  return `${first.slice(0, 8)}${String(day).padStart(2, "0")}`;
}

// 월간 달력에 보이는 날짜들. 월요일부터 시작하는 주 단위(4~6줄)로 채운다.
export function monthGrid(date: string) {
  const start = mondayOf(startOfMonth(date));
  const end = addDays(mondayOf(endOfMonth(date)), 6);
  const weeks: string[][] = [];
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(cursor, i)));
  }
  return weeks;
}

export function monthTitle(date: string) {
  return `${date.slice(0, 4)}년 ${Number(date.slice(5, 7))}월`;
}

// 캘린더에 보이는 날짜 범위(첫 날, 마지막 날). 월간은 달력 칸 전체, 주간은 그 주 월~일.
export function calendarRange(view: "month" | "week", date: string) {
  if (view === "month") {
    const weeks = monthGrid(date);
    return { first: weeks[0][0], last: weeks[weeks.length - 1][6] };
  }
  const first = mondayOf(date);
  return { first, last: addDays(first, 6) };
}
