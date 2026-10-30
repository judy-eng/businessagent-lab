import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

// 로그인하지 않은 요청은 /login 으로 보낸다. (빠른 1차 확인용이며,
// 데이터를 바꾸는 Server Action 안에서도 requireAuth()로 다시 확인한다.)
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/login") return NextResponse.next();
  // 정해진 시각에 알림을 확인하러 오는 스케줄러는 쿠키가 없다. 이 길은 라우트 안에서 CRON_SECRET으로 확인한다.
  if (path.startsWith("/api/cron/")) return NextResponse.next();

  const ok = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
    process.env.SESSION_SECRET,
  );
  if (ok) return NextResponse.next();

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
