"use client";

import Link from "next/link";
import { useState } from "react";
import { deleteDayMemo } from "../actions";
import { MemoForm } from "../memo-form";

// 한 줄 메모 한 개: 날짜를 누르면 캘린더에서 그날을 보고, 수정·삭제할 수 있다
export function MemoRow({
  date,
  label,
  memo,
}: {
  date: string;
  label: string;
  memo: string;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "confirm">("view");
  const small = "rounded-lg px-3 py-1.5 text-xs font-medium";

  return (
    <li className="rounded-2xl bg-emerald-50/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <Link
          href={`/calendar?date=${date}`}
          className="shrink-0 text-xs font-medium text-emerald-900 underline underline-offset-2"
        >
          {label}
        </Link>
        {mode === "view" && (
          <div className="flex shrink-0 gap-1">
            <button type="button" onClick={() => setMode("edit")} className={`${small} bg-white/80`}>
              수정
            </button>
            <button type="button" onClick={() => setMode("confirm")} className={`${small} bg-white/80 text-red-600`}>
              삭제
            </button>
          </div>
        )}
      </div>

      {mode === "edit" ? (
        <div>
          <MemoForm date={date} memo={memo} />
          <button type="button" onClick={() => setMode("view")} className="text-xs text-zinc-500 underline underline-offset-2">
            닫기
          </button>
        </div>
      ) : (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">{memo}</p>
      )}

      {mode === "confirm" && (
        <form action={deleteDayMemo} className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-zinc-700">
          <input type="hidden" name="date" value={date} />
          <span className="flex-1">이 한 줄을 삭제할까요?</span>
          <button type="submit" className={`${small} bg-red-600 text-white`}>
            삭제
          </button>
          <button type="button" onClick={() => setMode("view")} className={`${small} bg-white`}>
            취소
          </button>
        </form>
      )}
    </li>
  );
}
