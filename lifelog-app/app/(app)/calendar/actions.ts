"use server";

import { toggleRoutineLog } from "../routine/actions";

// 캘린더에서 루틴을 체크할 때 쓴다. 날짜를 앞에 묶어(bind) 쓰기 위한 얇은 연결 함수다.
// 로그인 확인과 입력 검사는 toggleRoutineLog 안에서 한다.
export async function toggleRoutineForDate(date: string, routineId: string, done: boolean) {
  await toggleRoutineLog(routineId, date, done);
}
