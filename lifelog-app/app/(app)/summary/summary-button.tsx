"use client";

import { useState, useTransition } from "react";
import { SummaryIcon } from "@/components/summary-icon";
import { makeDailySummary, makeWeeklySummary } from "./actions";

// '요약 보기' 버튼. 누르면 그 날(또는 그 주)의 숫자로 만든 요약 문장이 나타난다. (AI를 쓰지 않아서 무료)
export function SummaryButton({
  kind,
  target,
  placement,
}: {
  kind: "daily" | "weekly";
  target: string; // 일 단위는 날짜, 주간은 그 주 월요일 날짜
  placement: "inline" | "popover";
}) {
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const open = text !== null || error !== null;

  function toggle() {
    if (open) {
      setText(null);
      setError(null);
      return;
    }
    startTransition(async () => {
      try {
        const r = await (kind === "daily" ? makeDailySummary(target) : makeWeeklySummary(target));
        if (r.ok) setText(r.text);
        else setError(r.error);
      } catch {
        setError("요약을 만들지 못했어요. 잠시 후 다시 시도해주세요.");
      }
    });
  }

  const label = kind === "daily" ? "한줄 요약" : "주간 요약";
  const box =
    placement === "popover"
      ? "absolute right-0 top-full z-20 mt-2 w-[min(20rem,calc(100vw-3rem))]"
      : "order-last mt-2 w-full basis-full";

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-expanded={open}
        aria-label={open ? `${label} 닫기` : `${label} 보기`}
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white/80 px-3.5 text-xs font-semibold text-zinc-900 shadow-sm ring-1 ring-black/10 transition hover:bg-white disabled:opacity-60"
      >
        <SummaryIcon size={16} />
        {pending ? "만드는 중..." : open ? "닫기" : label}
      </button>
      {text !== null && (
        <p role="status" className={`${box} rounded-2xl bg-white/95 p-4 text-left text-sm font-normal leading-relaxed text-zinc-800 shadow-lg ring-1 ring-black/5`}>
          {text}
          <span className="mt-2 block text-[11px] text-zinc-400">숫자만 보고 만든 요약이라 원인을 단정하지 않아요</span>
        </p>
      )}
      {error !== null && (
        <p role="alert" className={`${box} rounded-2xl bg-white/95 p-3 text-left text-xs font-medium text-red-600 shadow-lg ring-1 ring-black/5`}>
          {error}
        </p>
      )}
    </>
  );
}
