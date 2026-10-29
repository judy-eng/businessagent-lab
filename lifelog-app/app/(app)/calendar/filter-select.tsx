"use client";

import { useRouter } from "next/navigation";

export type FilterOption = { value: string; label: string; group?: string };

// 특정 감정을 골라 그 감정이 있는 날을 강조한다. 고르면 그 주소로 이동한다.
export function FilterSelect({
  options,
  current,
  clearHref,
}: {
  options: { href: string; label: string; group: string }[];
  current: string | null; // 지금 선택된 항목의 주소 (없으면 null)
  clearHref: string;
}) {
  const router = useRouter();
  const groups = [...new Set(options.map((o) => o.group))];
  return (
    <select
      aria-label="특정 감정 보기"
      value={current ?? ""}
      onChange={(e) => router.push(e.target.value || clearHref)}
      className="h-9 max-w-full rounded-full bg-zinc-100 px-3 text-sm text-zinc-700 outline-none focus:ring-2 focus:ring-violet-300"
    >
      <option value="">특정 감정 보기</option>
      {groups.map((g) => (
        <optgroup key={g} label={g}>
          {options
            .filter((o) => o.group === g)
            .map((o) => (
              <option key={o.href} value={o.href}>
                {o.label}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
}
