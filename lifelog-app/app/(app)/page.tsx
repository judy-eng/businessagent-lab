import { logout } from "@/app/login/actions";

// 홈 화면은 개발 5단계에서 만든다. 지금은 비밀번호 보호만 확인하는 임시 화면이다.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
      <h1 className="text-3xl font-bold">라이프로그</h1>
      <p className="text-zinc-500">홈 화면은 준비 중입니다.</p>
      <form action={logout}>
        <button
          type="submit"
          className="rounded-xl border border-zinc-300 px-4 py-2 text-sm"
        >
          나가기
        </button>
      </form>
    </main>
  );
}
