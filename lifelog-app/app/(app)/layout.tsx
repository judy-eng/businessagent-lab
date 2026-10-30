import { Suspense } from "react";
import { TopNav } from "@/components/top-nav";
import { CarryoverGate } from "./reminder/carryover-gate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
      <TopNav />
      {/* 오후 11:30 이후 미완료 Todo가 있으면 어느 화면에서든 질문 창이 뜬다 */}
      <Suspense fallback={null}>
        <CarryoverGate />
      </Suspense>
      <div className="relative flex flex-1 flex-col px-4 pb-16 pt-2">
        {children}
      </div>
    </div>
  );
}
