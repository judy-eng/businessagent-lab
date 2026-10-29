import Link from "next/link";
import type { Category, Routine } from "@/lib/queries";
import { NO_CATEGORY, routineHref, type RoutineParams } from "./options";

// 카테고리별로 나눠 보기: 고르면 오늘 체크, 해빗트래커, 루틴 관리가 모두 그 카테고리의 루틴만 보여준다
export function CategoryFilter({
  params,
  categories,
  routines,
  filter,
}: {
  params: RoutineParams;
  categories: Category[];
  routines: Routine[];
  filter: string | null;
}) {
  const uncategorized = routines.filter(
    (r) => r.category_id === null || !categories.some((c) => c.id === r.category_id),
  ).length;
  // 카테고리를 하나도 안 만들었으면 나눌 게 없으므로 보여주지 않는다
  if (categories.length === 0) return null;

  const chip = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-sm transition ${
      active ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
    }`;
  const item = (label: string, count: number, value: string | null) => (
    <Link
      key={label}
      href={routineHref(params, { c: value })}
      aria-current={filter === value ? "true" : undefined}
      className={chip(filter === value)}
    >
      {label} <span className={filter === value ? "text-zinc-300" : "text-zinc-400"}>{count}</span>
    </Link>
  );

  return (
    <nav className="mb-5 flex flex-wrap gap-2" aria-label="카테고리별 보기">
      {item("전체", routines.length, null)}
      {categories.map((c) => item(c.name, routines.filter((r) => r.category_id === c.id).length, c.id))}
      {uncategorized > 0 && item("카테고리 없음", uncategorized, NO_CATEGORY)}
    </nav>
  );
}
