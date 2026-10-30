"use client";

import { useEffect, useState, useTransition } from "react";
import { removeSubscription, saveSubscription, sendTestPush } from "./actions";

type State = "loading" | "unsupported" | "denied" | "off" | "on";

function toKey(base64Url: string) {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const raw = atob((base64Url + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

// 브라우저 알림 켜기/끄기. 켜면 매일 오후 11:30에 미완료 Todo가 있을 때 알림이 온다.
export function NotificationSettings({ publicKey }: { publicKey: string }) {
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let next: State;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        next = "unsupported";
      } else if (Notification.permission === "denied") {
        next = "denied";
      } else {
        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        next = sub ? "on" : "off";
      }
      if (!cancelled) setState(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function enable() {
    setMessage(null);
    startTransition(async () => {
      try {
        // 알림 허용은 사용자가 버튼을 눌렀을 때만 물어볼 수 있다
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setState(permission === "denied" ? "denied" : "off");
          return;
        }
        const reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(publicKey) }));
        const json = sub.toJSON();
        await saveSubscription({
          endpoint: sub.endpoint,
          keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
        });
        setState("on");
        setMessage("알림을 켰어요.");
      } catch {
        setMessage("알림을 켜지 못했어요. 잠시 후 다시 시도해주세요.");
      }
    });
  }

  function disable() {
    setMessage(null);
    startTransition(async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        if (sub) {
          await removeSubscription(sub.endpoint);
          await sub.unsubscribe();
        }
        setState("off");
        setMessage("알림을 껐어요.");
      } catch {
        setMessage("알림을 끄지 못했어요. 잠시 후 다시 시도해주세요.");
      }
    });
  }

  function test() {
    setMessage(null);
    startTransition(async () => {
      try {
        const r = await sendTestPush();
        setMessage(
          r.delivered > 0
            ? "테스트 알림을 보냈어요. 잠시 후 알림이 와야 해요."
            : "보내지 못했어요. 알림을 껐다가 다시 켜 보세요.",
        );
      } catch {
        setMessage("테스트 알림을 보내지 못했어요.");
      }
    });
  }

  const button = "h-10 rounded-xl px-4 text-sm font-semibold disabled:opacity-50";

  return (
    <section className="mt-10 rounded-2xl bg-zinc-50 p-4" aria-label="알림 설정">
      <h2 className="text-sm font-semibold">브라우저 알림</h2>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">
        매일 오후 11:30에 미완료 Todo가 남아 있으면 &ldquo;다음 날에 하시겠습니까?&rdquo;라고 알려줘요. 앱을 닫아 둬도 오지만, 컴퓨터가 켜져 있고 브라우저가 실행 중이어야 해요.
      </p>

      {state === "loading" && <p className="mt-3 text-xs text-zinc-400">확인하는 중...</p>}
      {state === "unsupported" && (
        <p className="mt-3 text-xs text-zinc-500">
          이 브라우저에서는 알림을 켤 수 없어요. 알림은 https 주소나 localhost에서만 켤 수 있어요.
        </p>
      )}
      {state === "denied" && (
        <p className="mt-3 text-xs text-zinc-500">
          브라우저에서 알림이 막혀 있어요. 주소창 왼쪽 자물쇠 아이콘에서 알림을 &lsquo;허용&rsquo;으로 바꾼 뒤 새로고침해주세요.
        </p>
      )}
      {state === "off" && (
        <button type="button" onClick={enable} disabled={pending} className={`${button} mt-3 bg-zinc-900 text-white`}>
          {pending ? "켜는 중..." : "알림 켜기"}
        </button>
      )}
      {state === "on" && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">켜짐</span>
          <button type="button" onClick={test} disabled={pending} className={`${button} bg-white ring-1 ring-zinc-200`}>
            테스트 알림 보내기
          </button>
          <button type="button" onClick={disable} disabled={pending} className={`${button} bg-white text-zinc-600 ring-1 ring-zinc-200`}>
            알림 끄기
          </button>
        </div>
      )}
      {message && (
        <p role="status" className="mt-3 text-xs text-zinc-600">
          {message}
        </p>
      )}
    </section>
  );
}
