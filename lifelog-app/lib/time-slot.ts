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
