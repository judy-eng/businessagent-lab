"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ScoreSlider } from "../emotion/score-slider";

// 홈에서 점수만 빠르게 기록한다. 감정 종류와 원인은 감정 화면에서 기록한다.
export function QuickEmotion({
  onRecord,
}: {
  onRecord: (score: number, typeIds: number[], cause: string) => Promise<void>;
}) {
  const [score, setScore] = useState(5);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function record() {
    setError(null);
    startTransition(async () => {
      try {
        await onRecord(score, [], "");
        setDone(true);
        setScore(5);
      } catch {
        setError("저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
      }
    });
  }

  return (
    <div className="rounded-2xl bg-white/70 p-4">
      <h3 className="font-semibold">지금 기분은 어때요?</h3>
      <ScoreSlider
        score={score}
        onChange={(v) => {
          setDone(false);
          setScore(v);
        }}
      />
      <button
        type="button"
        onClick={record}
        disabled={pending}
        className="mt-4 h-11 w-full rounded-xl bg-zinc-900 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "기록 중..." : `${score}점 빠르게 기록하기`}
      </button>
      {done && (
        <p role="status" className="mt-2 text-center text-sm text-emerald-600">
          기록했어요
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-center text-sm text-red-600">
          {error}
        </p>
      )}
      <p className="mt-3 text-center text-xs text-zinc-500">
        <Link href="/emotion" className="underline underline-offset-2">
          감정 종류와 원인까지 자세히 기록하기
        </Link>
      </p>
    </div>
  );
}
