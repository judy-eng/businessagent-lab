"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 개발 2단계용 임시 이동 메뉴. 홈 화면의 탭 배치는 5단계에서 만든다.
const ITEMS = [
  { href: "/", label: "홈" },
  { href: "/todo", label: "Todo" },
  { href: "/routine", label: "루틴" },
  { href: "/schedule", label: "일정" },
  { href: "/diary", label: "일기" },
];

export function TopNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto px-4 py-3" aria-label="메뉴">
      {ITEMS.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
              active
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
