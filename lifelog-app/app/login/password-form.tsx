"use client";

import { useActionState, useState } from "react";
import { login, setupPassword } from "./actions";

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {!open && <path d="M4 4l16 16" />}
    </svg>
  );
}

function PasswordField({
  name,
  label,
  hint,
  autoComplete,
  autoFocus,
}: {
  name: string;
  label: string;
  hint?: string;
  autoComplete: string;
  autoFocus?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={name} className="block text-lg font-bold text-zinc-800">
        {label}
      </label>
      <div className="mt-2 flex items-center rounded-2xl border-2 border-transparent bg-zinc-200/70 px-4 focus-within:border-sky-500 focus-within:bg-zinc-100">
        <input
          id={name}
          name={name}
          type={visible ? "text" : "password"}
          required
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          className="h-14 min-w-0 flex-1 bg-transparent text-lg tracking-widest text-zinc-900 outline-none"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "비밀번호 숨기기" : "비밀번호 보기"}
          className="ml-2 text-zinc-700"
        >
          <EyeIcon open={visible} />
        </button>
      </div>
      {hint && <p className="mt-2 text-sm text-zinc-500">{hint}</p>}
    </div>
  );
}

export function PasswordForm({
  mode,
  ruleText,
}: {
  mode: "setup" | "login";
  ruleText: string;
}) {
  const [state, formAction, pending] = useActionState(
    mode === "setup" ? setupPassword : login,
    undefined,
  );

  return (
    <form action={formAction} className="w-full max-w-sm space-y-6">
      {mode === "setup" ? (
        <>
          <p className="text-sm text-zinc-600">
            처음 사용하시네요. 앞으로 사용할 비밀번호를 정해주세요.
          </p>
          <PasswordField
            name="password"
            label="비밀번호"
            hint={ruleText}
            autoComplete="new-password"
            autoFocus
          />
          <PasswordField
            name="confirm"
            label="비밀번호 확인"
            autoComplete="new-password"
          />
        </>
      ) : (
        <PasswordField
          name="password"
          label="비밀번호"
          autoComplete="current-password"
          autoFocus
        />
      )}

      {state?.error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-2xl bg-zinc-900 text-base font-semibold text-white transition disabled:opacity-50"
      >
        {pending ? "확인 중..." : mode === "setup" ? "비밀번호 정하기" : "들어가기"}
      </button>
    </form>
  );
}
