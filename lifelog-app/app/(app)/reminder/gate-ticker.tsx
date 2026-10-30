"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// 화면을 열어 둔 채로 알림 시각(오후 7시, 오후 11:30)이 되면 화면을 새로 고쳐서 질문이 나타나게 한다.
// 시각은 사용자 시간대 기준이다.
const BOUNDARIES_MIN = [19 * 60, 23 * 60 + 30];

function minutesNow(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return get("hour") * 60 + get("minute") + get("second") / 60;
}

export function GateTicker({ timeZone }: { timeZone: string }) {
  const router = useRouter();

  useEffect(() => {
    let timer: number | undefined;
    const schedule = () => {
      const now = minutesNow(timeZone);
      // 다음 경계: 오늘 남은 시각 중 가장 가까운 것, 없으면 내일 첫 경계
      const next = BOUNDARIES_MIN.find((m) => m > now) ?? BOUNDARIES_MIN[0] + 24 * 60;
      const delayMs = Math.max(1000, (next - now) * 60_000 + 1000);
      timer = window.setTimeout(() => {
        router.refresh();
        schedule();
      }, delayMs);
    };
    schedule();

    // 컴퓨터가 잠들었다 깨거나 탭으로 돌아오면 그 사이에 시각이 지났을 수 있으니 한 번 새로 고친다
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
        window.clearTimeout(timer);
        schedule();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, timeZone]);

  return null;
}
