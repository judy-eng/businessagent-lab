// 내 PC에서 앱을 켜 두고 쓸 때, 1분마다 알림 확인 길을 불러 주는 간단한 스케줄러.
// 앱을 인터넷에 올린 뒤에는 서버 쪽 스케줄러(supabase/scheduler-example.sql)가 이 일을 한다.
// 사용: npm run reminder:watch   (중지는 Ctrl+C)
const base = process.env.REMINDER_BASE_URL ?? "http://localhost:3000";
const secret = process.env.CRON_SECRET;
if (!secret) {
  console.error("CRON_SECRET 이 .env.local 에 필요합니다.");
  process.exit(1);
}

async function tick() {
  try {
    const res = await fetch(`${base}/api/cron/todo-reminder`, {
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(30000),
    });
    const body = await res.json();
    const stamp = new Date().toLocaleTimeString("ko-KR");
    // 아무 일도 없는 평소 상태는 조용히 넘어간다
    if (body.sent || (body.reason && !["not-in-window", "no-incomplete", "already-sent", "already-answered"].includes(body.reason))) {
      console.log(stamp, JSON.stringify(body));
    }
  } catch (e) {
    console.error(new Date().toLocaleTimeString("ko-KR"), "확인 실패:", e.message);
  }
}

console.log(`알림 확인을 1분마다 합니다 (${base}). 중지는 Ctrl+C`);
await tick();
setInterval(tick, 60_000);
