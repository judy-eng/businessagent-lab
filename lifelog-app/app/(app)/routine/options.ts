import { isUuid } from "@/lib/validate";

export type RoutineParams = {
  view?: string; // "tracker"
  date?: string;
  month?: string; // YYYY-MM
  layout?: string; // "table"
  c?: string | null; // 카테고리 번호 또는 "none"(카테고리 없음)
};

export const NO_CATEGORY = "none";

// 주소의 ?c= 값을 확인한다. 올바르지 않거나 없는 카테고리면 null(전체)
export function parseCategoryFilter(value: string | undefined, categoryIds: string[]) {
  if (value === NO_CATEGORY) return NO_CATEGORY;
  if (isUuid(value) && categoryIds.includes(value)) return value;
  return null;
}

// 루틴 화면 주소를 만든다. 필요한 값만 주소에 담는다.
export function routineHref(base: RoutineParams, overrides: RoutineParams = {}) {
  const o = { ...base, ...overrides };
  const params = new URLSearchParams();
  if (o.view === "tracker") params.set("view", "tracker");
  if (o.date) params.set("date", o.date);
  if (o.view === "tracker" && o.month) params.set("month", o.month);
  if (o.view === "tracker" && o.layout === "table") params.set("layout", "table");
  if (o.c) params.set("c", o.c);
  const q = params.toString();
  return q ? `/routine?${q}` : "/routine";
}

export function matchesCategory(categoryId: string | null, filter: string | null) {
  if (!filter) return true;
  return filter === NO_CATEGORY ? categoryId === null : categoryId === filter;
}

// 카테고리 순서대로(만든 순서), 카테고리 없음은 맨 뒤로 묶는다
export function groupByCategory<T extends { category_id: string | null }>(
  items: T[],
  categories: { id: string; name: string }[],
) {
  const groups: { id: string | null; name: string; items: T[] }[] = [];
  for (const c of categories) {
    const inGroup = items.filter((i) => i.category_id === c.id);
    if (inGroup.length) groups.push({ id: c.id, name: c.name, items: inGroup });
  }
  const none = items.filter((i) => i.category_id === null || !categories.some((c) => c.id === i.category_id));
  if (none.length) groups.push({ id: null, name: "카테고리 없음", items: none });
  return groups;
}
