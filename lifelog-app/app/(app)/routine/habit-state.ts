"use client";

import { useOptimistic, useState, useTransition } from "react";
import type { HabitRow, HabitStatus } from "@/lib/queries";
import { toggleRoutineLog } from "./actions";

// 해빗트래커의 두 보기(카드, 표)가 함께 쓰는 체크 동작: 누르면 바로 화면이 바뀌고 저장은 뒤에서 한다
export function useHabitToggle(rows: HabitRow[], today: string) {
  const [items, applyToggle] = useOptimistic(
    rows,
    (state, change: { id: string; date: string; done: boolean }) =>
      state.map((r) =>
        r.id !== change.id
          ? r
          : {
              ...r,
              days: r.days.map((d) =>
                d.date !== change.date
                  ? d
                  : {
                      ...d,
                      status: (change.done ? "done" : change.date < today ? "missed" : "pending") as HabitStatus,
                    },
              ),
            },
      ),
  );
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(rowId: string, date: string, status: HabitStatus) {
    const done = status !== "done";
    setError(null);
    startTransition(async () => {
      applyToggle({ id: rowId, date, done });
      try {
        await toggleRoutineLog(rowId, date, done);
      } catch {
        setError("저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
      }
    });
  }

  return { items, toggle, error };
}
