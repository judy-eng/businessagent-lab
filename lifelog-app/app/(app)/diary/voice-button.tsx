"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { voiceError } from "@/lib/voice";

// 브라우저 내장 음성 인식의 최소한의 모양 (크롬·엣지에서 쓸 수 있다)
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type RecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};
type RecognitionCtor = new () => Recognition;

function ctor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const subscribe = () => () => {};

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" />
    </svg>
  );
}

// 마이크 버튼: 누르고 말하면 글자로 바뀌어 일기 뒤에 이어 붙는다. 다시 누르면 멈추고, 멈추면 저장한다.
// 음성 파일은 저장하지 않고 글자만 남긴다.
export function VoiceButton({
  onSpeech,
  onStop,
}: {
  onSpeech: (text: string, continuation: boolean) => void; // 말한 글이 확정될 때마다
  onStop: (hadText: boolean) => void; // 음성 입력이 끝났을 때
}) {
  // 서버에서는 지원 여부를 모르므로 -1(모름)이고, 브라우저에서는 실제 값 (1 지원, 0 미지원).
  // 모르는 동안에는 아무것도 보여주지 않아서, 지원하는 브라우저에 '쓸 수 없어요' 문구가 잠깐 비치지 않는다.
  const support = useSyncExternalStore(subscribe, () => (ctor() !== null ? 1 : 0), () => -1);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<Recognition | null>(null);
  const wantRef = useRef(false); // 사용자가 멈추기 전까지 계속 듣는다
  const hadTextRef = useRef(false);
  const firstRef = useRef(true); // 이번 음성 입력의 첫 글인지 (첫 글은 새 줄에서 시작)

  function stopAll() {
    wantRef.current = false;
    recRef.current?.stop();
  }

  function begin() {
    const Ctor = ctor();
    if (!Ctor) return;
    setError(null);
    setInterim("");
    hadTextRef.current = false;
    firstRef.current = true;
    wantRef.current = true;

    const rec = new Ctor();
    rec.lang = "ko-KR";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          const text = r[0].transcript;
          if (text.trim()) {
            onSpeech(text, !firstRef.current);
            firstRef.current = false;
            hadTextRef.current = true;
          }
        } else {
          interimText += r[0].transcript;
        }
      }
      setInterim(interimText);
    };
    rec.onerror = (e) => {
      const info = voiceError(e.error);
      if (info.message) setError(info.message);
      if (info.fatal) wantRef.current = false;
    };
    rec.onend = () => {
      // 조용하면 브라우저가 알아서 끊는다. 사용자가 멈추지 않았으면 이어서 듣는다.
      if (wantRef.current) {
        try {
          rec.start();
          return;
        } catch {
          wantRef.current = false;
        }
      }
      setListening(false);
      setInterim("");
      recRef.current = null;
      onStop(hadTextRef.current);
    };

    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      wantRef.current = false;
      setError("음성 입력을 시작하지 못했어요. 잠시 후 다시 눌러주세요.");
    }
  }

  // 화면을 떠나면 마이크를 끈다
  useEffect(
    () => () => {
      wantRef.current = false;
      recRef.current?.abort();
    },
    [],
  );

  if (support === -1) return null;
  if (support === 0) {
    return (
      <p className="text-xs text-zinc-400">
        이 브라우저에서는 음성 입력을 쓸 수 없어요. 크롬이나 엣지에서 열어보세요.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={listening ? stopAll : begin}
        aria-pressed={listening}
        aria-label={listening ? "음성 입력 멈추기" : "음성으로 일기 쓰기"}
        className={`flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-semibold transition ${
          listening ? "animate-pulse bg-red-500 text-white" : "bg-white text-zinc-800 ring-1 ring-zinc-200 hover:bg-zinc-50"
        }`}
      >
        <MicIcon />
        {listening ? "듣는 중... 누르면 멈춰요" : "음성으로 쓰기"}
      </button>
      {listening && (
        <p role="status" className="min-h-5 max-w-full text-sm text-zinc-500">
          {interim ? `“${interim}”` : "말씀하세요. 말한 내용이 글자로 바뀌어 아래에 이어져요."}
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
      <p className="text-[11px] leading-relaxed text-zinc-400">
        음성은 브라우저(크롬은 구글 서버)가 글자로 바꿔줘요. 이 앱은 음성 파일을 저장하지 않고 글자만 남겨요.
      </p>
    </div>
  );
}
