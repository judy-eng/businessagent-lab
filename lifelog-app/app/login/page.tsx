import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAppUser, isAuthenticated } from "@/lib/auth";
import { PASSWORD_RULE_TEXT } from "@/lib/password";
import { PasswordForm } from "./password-form";

async function LoginContent() {
  if (await isAuthenticated()) redirect("/");

  // 비밀번호가 아직 없으면 처음 설정 화면, 있으면 입력 화면
  const user = await getAppUser();

  return (
    <PasswordForm
      mode={user ? "login" : "setup"}
      ruleText={PASSWORD_RULE_TEXT}
    />
  );
}

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <Suspense fallback={<p className="text-zinc-400">불러오는 중...</p>}>
        <LoginContent />
      </Suspense>
    </main>
  );
}
