"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";

export type CheckItem = {
  id: string;
  label: string;
  done: boolean;
  time?: string | null; // 일정의 'HH:MM:SS'
};

// 선택한 날짜의 일정/Todo/루틴 카드. 여기서 바로 완료 체크를 할 수 있다.
export function ChecklistCard({
  title,
  href,
  tone,
  accent,
  items,
  onToggle,
  showTime = false,
}: {
  title: string;
  href: string;
  tone: string; // 카드 배경 클래스
  accent: string; // 체크박스 색 클래스
  items: CheckItem[];
  onToggle: (id: string, done: boolean) => Promise<void>;
  showTime?: boolean;
}) {
  const [optimistic, applyToggle] = useOptimistic(
    items,
    (state, change: { id: string; done: boolean }) =>
      state.map((i) => (i.id === change.id ? { ...i, done: change.done } : i)),
  );
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string, done: boolean) {
    setError(null);
    startTransition(async () => {
      applyToggle({ id, done });
      try {
        await onToggle(id, done);
      } catch {
        setError("저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
      }
    });
  }

  const doneCount = optimistic.filter((i) => i.done).length;

  return (
    <section className={`rounded-2xl p-4 ${tone}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          {title}
          {optimistic.length > 0 && (
            <span className="ml-2 text-sm font-normal text-zinc-500">
              {doneCount} / {optimistic.length}
            </span>
          )}
        </h3>
        <Link href={href} className="text-xs text-zinc-500 underline underline-offset-2">
          열기
        </Link>
      </div>
      <div className="mt-3">
        {optimistic.length === 0 ? (
          <p className="text-sm text-zinc-400">기록이 없어요</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {optimistic.map((i) => (
              <li key={i.id}>
                <label className="flex cursor-pointer items-center gap-2 py-0.5">
                  <input
                    type="checkbox"
                    checked={i.done}
                    onChange={(e) => toggle(i.id, e.target.checked)}
                    className={`h-4 w-4 shrink-0 ${accent}`}
                  />
                  {showTime && (
                    <span className="w-12 shrink-0 tabular-nums text-sky-900">
                      {i.time ? i.time.slice(0, 5) : "시간 없음"}
                    </span>
                  )}
                  <span className={i.done ? "text-zinc-400 line-through" : ""}>{i.label}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        {error && (
          <p role="alert" className="mt-2 text-xs text-red-600">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
