import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAuthenticated } from "@/lib/auth";
import { answerCarryover } from "@/lib/reminder";

// 알림창의 '예/아니오' 버튼이 부르는 길. 로그인한 상태(쿠키)에서만 처리한다.
export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false, error: "로그인이 필요해요." }, { status: 401 });
  }
  let body: { answer?: unknown; date?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }
  const answer = body.answer === "yes" || body.answer === "no" ? body.answer : null;
  if (!answer || typeof body.date !== "string") {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }
  const result = await answerCarryover(body.date, answer);
  if (result.ok) {
    revalidatePath("/");
    revalidatePath("/todo");
    revalidatePath("/calendar");
  }
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
