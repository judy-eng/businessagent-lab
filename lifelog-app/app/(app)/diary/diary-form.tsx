"use client";

import { useActionState, useRef, useState } from "react";
import { clampDiary, joinTranscript } from "@/lib/voice";
import { saveDiary } from "./actions";
import { VoiceButton } from "./voice-button";

export function DiaryForm({ date, content }: { date: string; content: string }) {
  const [state, formAction, pending] = useActionState(
    saveDiary.bind(null, date),
    undefined,
  );
  const [text, setText] = useState(content);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={formAction} className="mt-6">
      <div className="mb-3">
        {/* 음성 입력: 말한 글이 일기 뒤에 이어 붙고, 멈추면 자동으로 저장한다 */}
        <VoiceButton
          onSpeech={(spoken, continuation) =>
            setText((prev) => clampDiary(joinTranscript(prev, spoken, continuation)))
          }
          onStop={(hadText) => {
            // 마지막 글이 화면에 반영된 뒤에 저장한다
            if (hadText) window.setTimeout(() => formRef.current?.requestSubmit(), 0);
          }}
        />
      </div>
      <label htmlFor="content" className="sr-only">
        일기
      </label>
      <textarea
        id="content"
        name="content"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={14}
        maxLength={20000}
        placeholder="오늘 있었던 일을 자유롭게 적어보세요."
        className="w-full resize-y rounded-2xl bg-orange-100/60 p-4 leading-relaxed outline-none focus:ring-2 focus:ring-orange-300"
      />
      <div className="mt-3 flex items-center justify-between">
        <p
          role="status"
          className={`text-sm ${state?.error ? "text-red-600" : "text-emerald-600"}`}
        >
          {state?.error ?? (state?.saved ? "저장했어요" : "")}
        </p>
        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-2xl bg-zinc-900 px-6 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "저장 중..." : "저장"}
        </button>
      </div>
    </form>
  );
}
