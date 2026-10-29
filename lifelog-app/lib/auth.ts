import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET 이 .env.local 에 32자 이상으로 필요합니다.");
  }
  return secret;
}

// 비밀번호가 설정되어 있으면 { password_hash, timezone }, 아직 없으면 null
export async function getAppUser() {
  const { data, error } = await supabaseAdmin()
    .from("app_user")
    .select("password_hash, timezone")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(`app_user 조회 실패: ${error.message}`);
  return data;
}

export async function isAuthenticated() {
  // 만료 시각 비교에 현재 시각을 쓰므로, 요청 시점에 계산되도록 먼저 표시한다.
  await connection();
  const store = await cookies();
  return verifySessionToken(
    store.get(SESSION_COOKIE)?.value,
    process.env.SESSION_SECRET,
  );
}

// 모든 Server Action 맨 앞에서 호출한다. (Server Action은 화면 밖에서도 직접 호출될 수 있다)
export async function requireAuth() {
  if (!(await isAuthenticated())) throw new Error("Unauthorized");
}
