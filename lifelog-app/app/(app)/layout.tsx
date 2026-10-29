import { TopNav } from "@/components/top-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
      <TopNav />
      <div className="relative flex flex-1 flex-col px-4 pb-16 pt-2">
        {children}
      </div>
    </div>
  );
}
