"use client";

import { useOptimistic, useState, useTransition } from "react";
import type { ChecklistRoutine } from "@/lib/queries";
import { toggleRoutineLog } from "./actions";

export function RoutineChecklist({
  date,
  routines,
  categoryNames,
}: {
  date: string;
  routines: ChecklistRoutine[];
  categoryNames: Record<string, string>;
}) {
  const [items, applyToggle] = useOptimistic(
    routines,
    (state, change: { id: string; done: boolean }) =>
      state.map((r) => (r.id === change.id ? { ...r, done: change.done } : r)),
  );
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string, done: boolean) {
    setError(null);
    startTransition(async () => {
      applyToggle({ id, done });
      try {
        await toggleRoutineLog(id, date, done);
      } catch {
        setError("저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
      }
    });
  }

  if (items.length === 0) {
    return (
      <p className="rounded-2xl bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
        이 날 체크할 루틴이 없어요. 아래 &lsquo;루틴 관리&rsquo;에서 루틴을 등록해보세요.
      </p>
    );
  }

  const doneCount = items.filter((r) => r.done).length;

  return (
    <>
      <p className="mb-3 text-sm text-zinc-500">
        {doneCount} / {items.length} 완료
      </p>
      <ul className="space-y-2">
        {items.map((r) => (
          <li key={r.id}>
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-amber-100/70 px-4 py-3">
              <input
                type="checkbox"
                checked={r.done}
                onChange={(e) => toggle(r.id, e.target.checked)}
                className="h-5 w-5 shrink-0 accent-amber-600"
              />
              <span className={`flex-1 ${r.done ? "text-zinc-400 line-through" : ""}`}>
                {r.name}
              </span>
              {r.category_id && categoryNames[r.category_id] && (
                <span className="rounded-full border border-amber-700/30 px-2 py-0.5 text-xs text-amber-900">
                  {categoryNames[r.category_id]}
                </span>
              )}
            </label>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
    </>
  );
}
