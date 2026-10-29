"use client";

import { useEffect, useRef } from "react";
import { GROUP_COLORS, type EmotionType } from "@/lib/emotion";

const SIZES = [84, 68, 76, 92, 64, 80];
const REACH = 130; // 커서가 이 거리 안으로 들어오면 버블이 밀린다 (px)
const MAX_PUSH = 18; // 가장 가까울 때 밀리는 거리 (px)
const REST_DELAY = 160; // 커서가 멈췄다고 보는 시간 (ms)

// 거품처럼 움직이는 감정 버블 모음.
// - 커서가 다가오면 버블이 살짝 밀려난다
// - 커서가 버블 위에서 멈추면 그 버블이 살짝 커진다
// - 버블은 가만히 있어도 천천히 떠다닌다 (CSS)
export function BubbleCloud({
  types,
  selected,
  onToggle,
  onAddClick,
  addOpen,
}: {
  types: EmotionType[];
  selected: number[];
  onToggle: (id: number) => void;
  onAddClick: () => void;
  addOpen: boolean;
}) {
  const containerRef = useRef<HTMLUListElement>(null);
  const items = useRef(new Map<number, HTMLLIElement>());
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const frame = useRef(0);
  const restTimer = useRef<number | undefined>(undefined);

  function clearRest() {
    items.current.forEach((el) => delete el.dataset.rest);
  }

  function update() {
    frame.current = 0;
    const p = pointer.current;
    items.current.forEach((el) => {
      if (!p) {
        el.style.transform = "";
        return;
      }
      // offset* 값은 transform의 영향을 받지 않아서 흔들림 없이 계산된다
      const cx = el.offsetLeft + el.offsetWidth / 2;
      const cy = el.offsetTop + el.offsetHeight / 2;
      const dx = cx - p.x;
      const dy = cy - p.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist >= REACH) {
        el.style.transform = "";
        return;
      }
      const push = Math.pow(1 - dist / REACH, 1.5) * MAX_PUSH;
      el.style.transform = `translate(${(dx / dist) * push}px, ${(dy / dist) * push}px)`;
    });
  }

  function schedule() {
    if (!frame.current) frame.current = requestAnimationFrame(update);
  }

  function onPointerMove(e: React.PointerEvent<HTMLUListElement>) {
    if (e.pointerType === "touch") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = containerRef.current!.getBoundingClientRect();
    const x = e.clientX - box.left;
    const y = e.clientY - box.top;
    pointer.current = { x, y };
    clearRest();
    schedule();

    window.clearTimeout(restTimer.current);
    restTimer.current = window.setTimeout(() => {
      // 커서가 멈췄다: 커서가 올라가 있는 버블을 키운다
      let hit: HTMLLIElement | null = null;
      items.current.forEach((el) => {
        const r = el.offsetWidth / 2;
        const d = Math.hypot(
          el.offsetLeft + r - x,
          el.offsetTop + el.offsetHeight / 2 - y,
        );
        if (d <= r) hit = el;
      });
      (hit as HTMLLIElement | null)?.setAttribute("data-rest", "true");
    }, REST_DELAY);
  }

  function onPointerLeave() {
    pointer.current = null;
    window.clearTimeout(restTimer.current);
    clearRest();
    schedule();
  }

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      window.clearTimeout(restTimer.current);
    },
    [],
  );

  return (
    <ul
      ref={containerRef}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="relative flex flex-wrap justify-center gap-2"
    >
      {types.map((t) => {
        const size = SIZES[(t.id * 7) % SIZES.length];
        const on = selected.includes(t.id);
        const c = GROUP_COLORS[t.grp];
        return (
          <li
            key={t.id}
            ref={(el) => {
              if (el) items.current.set(t.id, el);
              else items.current.delete(t.id);
            }}
            className="bubble-push group"
          >
            <div
              className="bubble-float"
              style={{
                animationDuration: `${5 + (t.id % 5)}s`,
                animationDelay: `-${(t.id * 0.7) % 5}s`,
              }}
            >
              <button
                type="button"
                onClick={() => onToggle(t.id)}
                aria-pressed={on}
                style={{
                  width: size,
                  height: size,
                  backgroundColor: c.bg,
                  color: c.text,
                }}
                className={`flex items-center justify-center rounded-full text-sm font-semibold shadow-md shadow-black/15 transition-[transform,opacity,box-shadow] duration-300 ease-out group-data-[rest=true]:scale-110 ${
                  on
                    ? "scale-105 ring-4 ring-zinc-800/80"
                    : selected.length > 0
                      ? "opacity-60"
                      : ""
                }`}
              >
                {t.name}
              </button>
            </div>
          </li>
        );
      })}
      {/* 감정 직접 추가 버블 */}
      <li
        ref={(el) => {
          if (el) items.current.set(-1, el);
          else items.current.delete(-1);
        }}
        className="bubble-push group"
      >
        <div
          className="bubble-float"
          style={{ animationDuration: "7s", animationDelay: "-1.5s" }}
        >
          <button
            type="button"
            onClick={onAddClick}
            aria-expanded={addOpen}
            aria-label="감정 직접 추가"
            style={{ width: 72, height: 72 }}
            className={`flex flex-col items-center justify-center rounded-full border-2 border-dashed border-zinc-400 bg-white/60 text-zinc-600 transition-[transform,background-color] duration-300 ease-out group-data-[rest=true]:scale-110 ${
              addOpen ? "scale-105 bg-white" : ""
            }`}
          >
            <span className="text-2xl leading-none">{addOpen ? "×" : "+"}</span>
            <span className="mt-0.5 text-[11px] font-medium">감정 추가</span>
          </button>
        </div>
      </li>
    </ul>
  );
}
