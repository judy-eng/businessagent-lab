"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import type { Schedule } from "@/lib/queries";
import { addSchedule, deleteSchedule, toggleSchedule } from "./actions";

type Change =
  | { type: "add"; item: Schedule }
  | { type: "toggle"; id: string; done: boolean }
  | { type: "remove"; id: string };

// 시간이 있는 일정을 시간순으로, 시간이 없는 일정은 맨 아래에 둔다.
function sortSchedules(items: Schedule[]) {
  return [...items].sort((a, b) => {
    if (a.time === b.time) return 0;
    if (a.time === null) return 1;
    if (b.time === null) return -1;
    return a.time < b.time ? -1 : 1;
  });
}

function applyChange(state: Schedule[], change: Change): Schedule[] {
  switch (change.type) {
    case "add":
      return sortSchedules([...state, change.item]);
    case "toggle":
      return state.map((s) => (s.id === change.id ? { ...s, done: change.done } : s));
    case "remove":
      return state.filter((s) => s.id !== change.id);
  }
}

export function ScheduleList({
  date,
  schedules,
}: {
  date: string;
  schedules: Schedule[];
}) {
  const [items, applyOptimistic] = useOptimistic(schedules, applyChange);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function run(change: Change, action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      applyOptimistic(change);
      try {
        await action();
      } catch {
        setError("저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
      }
    });
  }

  function onAdd(formData: FormData) {
    const title = String(formData.get("title") ?? "").trim();
    const time = String(formData.get("time") ?? "");
    if (!title) return;
    formRef.current?.reset();
    run(
      {
        type: "add",
        item: {
          id: crypto.randomUUID(),
          date,
          time: time ? `${time}:00` : null,
          title,
          done: false,
        },
      },
      () => addSchedule(date, time, title),
    );
  }

  const doneCount = items.filter((s) => s.done).length;

  return (
    <section className="mt-6">
      <p className="mb-3 text-sm text-zinc-500">
        {items.length === 0 ? "일정이 없어요" : `${doneCount} / ${items.length} 완료`}
      </p>

      <ul className="space-y-2">
        {items.map((s) => (
          <li
            key={s.id}
            className="flex items-center gap-3 rounded-2xl bg-sky-100/70 px-4 py-3"
          >
            <input
              type="checkbox"
              checked={s.done}
              onChange={(e) =>
                run({ type: "toggle", id: s.id, done: e.target.checked }, () =>
                  toggleSchedule(s.id, e.target.checked),
                )
              }
              aria-label={`${s.title} 완료`}
              className="h-5 w-5 shrink-0 accent-sky-600"
            />
            <span className="w-14 shrink-0 text-sm tabular-nums text-sky-900">
              {s.time ? s.time.slice(0, 5) : "시간 없음"}
            </span>
            <span
              className={`min-w-0 flex-1 truncate ${
                s.done ? "text-zinc-400 line-through" : ""
              }`}
            >
              {s.title}
            </span>
            <button
              type="button"
              onClick={() => run({ type: "remove", id: s.id }, () => deleteSchedule(s.id))}
              aria-label={`${s.title} 삭제`}
              className="px-1 text-zinc-400 hover:text-red-500"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <form ref={formRef} action={onAdd} className="mt-4 flex gap-2">
        <input
          type="time"
          name="time"
          aria-label="시간"
          className="h-12 rounded-2xl bg-zinc-100 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-400"
        />
        <input
          name="title"
          maxLength={200}
          placeholder="일정 추가"
          aria-label="일정 추가"
          className="h-12 min-w-0 flex-1 rounded-2xl bg-zinc-100 px-4 outline-none focus:ring-2 focus:ring-sky-400"
        />
        <button
          type="submit"
          className="h-12 rounded-2xl bg-zinc-900 px-5 text-sm font-semibold text-white"
        >
          추가
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}
