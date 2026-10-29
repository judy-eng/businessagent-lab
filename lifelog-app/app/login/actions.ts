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

export async function login(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  const user = await getAppUser();
  if (!user) return { error: "비밀번호가 아직 정해지지 않았습니다. 새로고침 해주세요." };

  if (!(await verifyPassword(password, user.password_hash))) {
    // 연속 시도를 느리게 만든다.
    await new Promise((resolve) => setTimeout(resolve, 800));
    return { error: "비밀번호가 맞지 않습니다." };
  }

  await startSession();
  redirect("/");
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
