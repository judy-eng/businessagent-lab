"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { answerCarryoverAction } from "./actions";

// 오후 11:30 이후, 미완료 Todo가 남아 있으면 앱 안에서 묻는다. (알림을 누르거나 앱을 열었을 때)
export function CarryoverPrompt({
  date,
  titles,
}: {
  date: string;
  titles: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function answer(choice: "yes" | "no") {
    setError(null);
    startTransition(async () => {
      try {
        const r = await answerCarryoverAction(date, choice);
        if (!r.ok) {
          setError(r.error);
          return;
        }
        setResult(
          choice === "yes"
            ? `미완료 Todo ${r.moved}개를 내일로 옮겼어요.`
            : "알겠어요. 오늘 Todo는 그대로 둘게요.",
        );
        router.refresh();
        window.setTimeout(() => setResult(null), 3500);
      } catch {
        setError("저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
      }
    });
  }

  if (result) {
    return (
      <div role="status" className="fixed inset-x-4 bottom-6 z-50 mx-auto max-w-md rounded-2xl bg-zinc-900 px-5 py-4 text-sm text-white shadow-2xl">
        {result}
      </div>
    );
  }

  return (
    <div
      role="alertdialog"
      aria-labelledby="carryover-title"
      className="fixed inset-x-4 bottom-6 z-50 mx-auto max-w-md rounded-3xl bg-white p-5 shadow-2xl ring-1 ring-zinc-200"
    >
      <h2 id="carryover-title" className="font-semibold">
        미완료 todo 가 남아있습니다. 다음 날에 하시겠습니까?
      </h2>
      <ul className="mt-3 max-h-32 space-y-1 overflow-y-auto text-sm text-zinc-600">
        {titles.map((t, i) => (
          <li key={i} className="truncate">
            · {t}
          </li>
        ))}
      </ul>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => answer("yes")}
          className="h-11 rounded-xl bg-zinc-900 text-sm font-semibold text-white disabled:opacity-50"
        >
          예, 내일로 옮겨요
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => answer("no")}
          className="h-11 rounded-xl bg-zinc-100 text-sm font-semibold text-zinc-700 disabled:opacity-50"
        >
          아니오
        </button>
      </div>
      <p className="mt-3 text-xs text-zinc-400">&lsquo;아니오&rsquo;를 고르면 지우지 않고 오늘 Todo에 체크 안 된 채로 남아요.</p>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
