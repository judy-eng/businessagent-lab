export type TimeSlot = "morning" | "afternoon" | "evening" | "late_night";

export const SLOT_LABELS: Record<TimeSlot, string> = {
  morning: "아침",
  afternoon: "오후",
  evening: "저녁",
  late_night: "심야/새벽",
};

// 시간대 구분 (기획안 3-4):
// 아침 06:00~12:00, 오후 12:00~18:00, 저녁 18:00~24:00, 심야/새벽 00:00~06:00
export function timeSlotOfHour(hour: number): TimeSlot {
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18) return "evening";
  return "late_night";
}

// 입력 시각을 사용자 시간대로 바꿔서 날짜(달력상 당일)와 시간대를 구한다.
// 자정 직후 기록은 달력상 당일 날짜에 귀속된다.
export function localDateAndSlot(at: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    timeSlot: timeSlotOfHour(Number(get("hour"))),
  };
}

// 사용자 시간대의 시와 분 (알림 시각 판단에 쓴다)
export function localHourMinute(at: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return { hour: get("hour"), minute: get("minute") };
}

// 알림 시각 규칙 (기획안 5번)
export const EMOTION_PROMPT_FROM_HOUR = 19; // 오후 7시 이후, 오늘 감정 기록이 없으면 질문을 보여준다
export const CARRYOVER_HOUR = 23;
export const CARRYOVER_MINUTE = 30; // 오후 11:30 이후부터 자정까지

export function isEmotionPromptTime(at: Date, timeZone: string) {
  return localHourMinute(at, timeZone).hour >= EMOTION_PROMPT_FROM_HOUR;
}

export function isCarryoverTime(at: Date, timeZone: string) {
  const { hour, minute } = localHourMinute(at, timeZone);
  return hour === CARRYOVER_HOUR && minute >= CARRYOVER_MINUTE;
}
