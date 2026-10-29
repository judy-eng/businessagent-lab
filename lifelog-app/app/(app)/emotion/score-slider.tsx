"use client";

import { scoreColor } from "@/lib/emotion";

// 슬라이드 바 위의 얼굴: 0점은 찡그린 얼굴, 10점은 웃는 얼굴
function Face({ score }: { score: number }) {
  // 입 모양의 곡선 제어점: 위로(찡그림) → 아래로(웃음)
  const mouthY = 10.5 + (score / 10) * 8.5;
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="1.7"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9.5" />
      <circle cx="8.8" cy="9.6" r="0.6" fill="white" />
      <circle cx="15.2" cy="9.6" r="0.6" fill="white" />
      <path d={`M7.8 15.3 Q12 ${mouthY} 16.2 15.3`} />
    </svg>
  );
}

export function ScoreSlider({
  score,
  onChange,
}: {
  score: number;
  onChange: (score: number) => void;
}) {
  const color = scoreColor(score);
  // 핸들(24px)의 중심이 막대 안에서 움직이는 위치에 맞춘다
  const left = `calc(${score * 10}% + ${12 - score * 2.4}px)`;
  return (
    <div className="px-2 pt-16">
      <div className="relative">
        <div
          className="pointer-events-none absolute -top-[4.25rem] flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full rounded-br-none"
          style={{
            left,
            backgroundColor: color,
            transform: "translateX(-50%) rotate(45deg)",
          }}
        >
          <span style={{ transform: "rotate(-45deg)" }} className="flex">
            <Face score={score} />
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={score}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="감정 점수"
          aria-valuetext={`${score}점`}
          className="score-slider w-full"
          style={{ ["--thumb-color" as string]: color }}
        />
      </div>
      <div className="mt-2 flex justify-between text-sm text-zinc-500">
        <span>매우 나쁨</span>
        <span className="font-semibold text-zinc-800">{score}점</span>
        <span>매우 좋음</span>
      </div>
    </div>
  );
}
