"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAppUser, sessionSecret } from "@/lib/auth";
import {
  hashPassword,
  passwordRuleError,
  verifyPassword,
} from "@/lib/password";
import {
  createSessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

export type FormState = { error?: string } | undefined;

async function startSession() {
  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(sessionSecret()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

// 처음 사용할 때 비밀번호를 정한다. 이미 정해져 있으면 거부한다.
export async function setupPassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const ruleError = passwordRuleError(password);
  if (ruleError) return { error: ruleError };
  if (password !== confirm) return { error: "비밀번호가 서로 다릅니다." };

  // id=1 고정 행이라서 동시에 두 번 눌러도 하나만 저장된다.
  const { error } = await supabaseAdmin()
    .from("app_user")
    .insert({ id: 1, password_hash: await hashPassword(password) });
  if (error) {
    return { error: "이미 비밀번호가 정해져 있습니다. 새로고침 해주세요." };
  }

  await startSession();
  redirect("/");
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export async function login(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  const user = await getAppUser();
  if (!user) return { error: "비밀번호가 아직 정해지지 않았습니다. 새로고침 해주세요." };

  const db = supabaseAdmin();
  const lock = await db
    .from("app_user")
    .select("failed_attempts, locked_until")
    .eq("id", 1)
    .single();
  if (lock.error) return { error: "확인하지 못했습니다. 잠시 후 다시 시도해주세요." };

  const now = Date.now();
  const lockedUntil = lock.data.locked_until ? new Date(lock.data.locked_until).getTime() : 0;
  if (lockedUntil > now) {
    const minutes = Math.ceil((lockedUntil - now) / 60000);
    return { error: `비밀번호를 여러 번 틀렸어요. ${minutes}분 뒤에 다시 시도해주세요.` };
  }

  if (!(await verifyPassword(password, user.password_hash))) {
    // 연속 시도를 느리게 만든다.
    await new Promise((resolve) => setTimeout(resolve, 800));
    // 잠금이 풀린 뒤의 첫 실패는 처음부터 다시 센다.
    const previous = lockedUntil > 0 ? 0 : lock.data.failed_attempts;
    const failed = previous + 1;
    const locking = failed >= MAX_FAILED_ATTEMPTS;
    await db
      .from("app_user")
      .update({
        failed_attempts: locking ? 0 : failed,
        locked_until: locking ? new Date(now + LOCK_MINUTES * 60000).toISOString() : null,
      })
      .eq("id", 1);
    if (locking) {
      return { error: `비밀번호를 ${MAX_FAILED_ATTEMPTS}번 틀렸어요. ${LOCK_MINUTES}분 뒤에 다시 시도해주세요.` };
    }
    return { error: "비밀번호가 맞지 않습니다." };
  }

  await db.from("app_user").update({ failed_attempts: 0, locked_until: null }).eq("id", 1);
  await startSession();
  redirect("/");
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
