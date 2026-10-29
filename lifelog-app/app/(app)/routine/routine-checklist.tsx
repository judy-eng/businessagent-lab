"use client";

import { useOptimistic, useState, useTransition } from "react";
import type { ChecklistRoutine } from "@/lib/queries";
import { toggleRoutineLog } from "./actions";
import { groupByCategory } from "./options";

// 오늘 체크: 루틴을 카테고리별로 묶어서 보여준다
export function RoutineChecklist({
  date,
  routines,
  categories,
}: {
  date: string;
  routines: ChecklistRoutine[];
  categories: { id: string; name: string }[];
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
  const groups = groupByCategory(items, categories);
  // 카테고리를 쓰지 않는 경우에는 묶음 제목 없이 한 목록으로 보여준다
  const showHeadings = groups.length > 1 || groups.some((g) => g.id !== null);

  return (
    <>
      <p className="mb-3 text-sm text-zinc-500">
        {doneCount} / {items.length} 완료
      </p>
      <div className="space-y-5">
        {groups.map((g) => (
          <section key={g.id ?? "none"} aria-label={g.name}>
            {showHeadings && (
              <h3 className="mb-2 flex items-baseline gap-2 text-sm font-semibold text-amber-900">
                {g.name}
                <span className="text-xs font-normal text-zinc-400">
                  {g.items.filter((r) => r.done).length}/{g.items.length}
                </span>
              </h3>
            )}
            <ul className="space-y-2">
              {g.items.map((r) => (
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
                  </label>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
    </>
  );
}
