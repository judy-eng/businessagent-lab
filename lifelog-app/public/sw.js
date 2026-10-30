// 라이프로그 알림용 서비스 워커: 앱을 닫아 둬도 서버가 보낸 알림을 받아서 보여준다.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }
  const options = {
    body: payload.body || "",
    tag: payload.tag || "lifelog",
    data: { url: payload.url || "/", ...(payload.data || {}) },
    actions: Array.isArray(payload.actions) ? payload.actions : [],
  };
  event.waitUntil(self.registration.showNotification(payload.title || "라이프로그", options));
});

async function openApp(url) {
  const target = new URL(url || "/", self.location.origin).href;
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of windows) {
    if (client.url.startsWith(self.location.origin) && "focus" in client) {
      await client.focus();
      if ("navigate" in client) await client.navigate(target).catch(() => {});
      return;
    }
  }
  await self.clients.openWindow(target);
}

self.addEventListener("notificationclick", (event) => {
  const notification = event.notification;
  notification.close();
  const data = notification.data || {};

  // 알림창의 '예/아니오' 버튼: 앱을 열지 않고 바로 처리한다
  if ((event.action === "yes" || event.action === "no") && data.kind === "todo_carryover") {
    event.waitUntil(
      fetch("/api/reminder/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ answer: event.action, date: data.date }),
      })
        .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
        .then((result) =>
          self.registration.showNotification("라이프로그", {
            body:
              event.action === "yes"
                ? `미완료 Todo ${result.moved}개를 내일로 옮겼어요.`
                : "알겠어요. 오늘 Todo는 그대로 둘게요.",
            tag: "todo-carryover-result",
          }),
        )
        // 로그인이 풀렸거나 처리하지 못했으면 앱을 열어서 직접 고르게 한다
        .catch(() => openApp(data.url || "/?carryover=1")),
    );
    return;
  }

  // 알림 본문을 누르면 앱이 열리고, 앱 안의 질문 창에서 답한다
  event.waitUntil(openApp(data.url || "/"));
});
