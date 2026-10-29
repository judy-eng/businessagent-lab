"use client";

import { useActionState } from "react";
import { MEMO_MAX_LENGTH } from "@/lib/memo";
import { saveDayMemo } from "./actions";

// 홈의 한 줄 메모: 오늘 하루를 한 줄로 직접 적는다
export function MemoForm({ date, memo }: { date: string; memo: string }) {
  const [state, formAction, pending] = useActionState(
    saveDayMemo.bind(null, date),
    undefined,
  );

  return (
    <form action={formAction} className="mt-3">
      <label htmlFor="memo" className="sr-only">
        오늘의 한 줄 메모
      </label>
      <div className="flex gap-2">
        <input
          id="memo"
          name="memo"
          defaultValue={memo}
          maxLength={MEMO_MAX_LENGTH}
          placeholder="오늘을 한 줄로 남겨보세요"
          className="h-11 min-w-0 flex-1 rounded-xl bg-white/80 px-3 text-sm outline-none focus:ring-2 focus:ring-violet-300"
        />
        <button
          type="submit"
          disabled={pending}
          className="h-11 shrink-0 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "저장 중" : "저장"}
        </button>
      </div>
      <p
        role="status"
        className={`mt-1.5 min-h-4 text-xs ${state?.error ? "text-red-600" : "text-emerald-600"}`}
      >
        {state?.error ?? (state?.saved ? "저장했어요" : "")}
      </p>
    </form>
  );
}
