import { connection } from "next/server";
import { getTimezone } from "@/lib/queries";
import { getIncompleteTodos, getReminderLog } from "@/lib/reminder";
import { isCarryoverTime, localDateAndSlot } from "@/lib/time-slot";
import { CarryoverPrompt } from "./carryover-prompt";
import { GateTicker } from "./gate-ticker";

// 모든 화면에서: 오후 11:30 이후에 미완료 Todo가 남아 있고 아직 답하지 않았다면 질문 창을 띄운다.
// 시각을 먼저 확인하고, 그 시각이 아닐 때는 데이터베이스를 읽지 않는다.
export async function CarryoverGate() {
  await connection();
  const timeZone = await getTimezone();
  const now = new Date();
  const ticker = <GateTicker timeZone={timeZone} />;
  if (!isCarryoverTime(now, timeZone)) return ticker;

  const { date } = localDateAndSlot(now, timeZone);
  const todos = await getIncompleteTodos(date);
  if (todos.length === 0) return ticker;
  const log = await getReminderLog(date);
  if (log?.answer) return ticker;

  return (
    <>
      <CarryoverPrompt date={date} titles={todos.map((t) => t.title)} />
      {ticker}
    </>
  );
}
