import { WEEKDAY_LABELS } from "@/lib/dates";
import { groupByCategory } from "./options";
import type { Category, Routine } from "@/lib/queries";
import {
  createCategory,
  createRoutine,
  deleteCategory,
  deleteRoutine,
  setRoutineActive,
  updateRoutine,
} from "./actions";

const field =
  "h-11 min-w-0 rounded-xl bg-zinc-100 px-3 text-sm outline-none focus:ring-2 focus:ring-amber-400";
const smallButton = "rounded-lg px-3 py-1.5 text-xs font-medium";

function DayPicker({ selected }: { selected: number[] }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="반복 요일">
      {WEEKDAY_LABELS.map((label, day) => (
        <label key={day} className="cursor-pointer">
          <input
            type="checkbox"
            name="days"
            value={day}
            defaultChecked={selected.includes(day)}
            className="peer sr-only"
          />
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-sm text-zinc-600 peer-checked:bg-amber-500 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-amber-400">
            {label}
          </span>
        </label>
      ))}
    </div>
  );
}

function CategorySelect({
  categories,
  value,
}: {
  categories: Category[];
  value: string | null;
}) {
  return (
    <select name="categoryId" defaultValue={value ?? ""} className={field}>
      <option value="">카테고리 없음</option>
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}

function daysText(days: number[]) {
  if (days.length === 7) return "매일";
  return days.map((d) => WEEKDAY_LABELS[d]).join(" ");
}

export function RoutineManager({
  routines,
  categories,
  filtered,
}: {
  routines: Routine[]; // 카테고리 필터가 이미 적용된 목록
  categories: Category[];
  filtered: boolean; // 카테고리를 골라서 보고 있는지
}) {
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const groups = groupByCategory(routines, categories);
  // 카테고리를 쓰지 않는 경우에는 묶음 제목 없이 한 목록으로 보여준다
  const showHeadings = groups.length > 1 || groups.some((g) => g.id !== null);

  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-3 font-semibold">새 루틴</h3>
        <form action={createRoutine} className="space-y-3 rounded-2xl bg-zinc-50 p-4">
          <input
            name="name"
            required
            maxLength={100}
            placeholder="루틴 이름 (예: 독서)"
            aria-label="루틴 이름"
            className={`${field} w-full`}
          />
          <CategorySelect categories={categories} value={null} />
          <div>
            <p className="mb-2 text-xs text-zinc-500">반복 요일</p>
            <DayPicker selected={[0, 1, 2, 3, 4, 5, 6]} />
          </div>
          <button
            type="submit"
            className="h-11 w-full rounded-xl bg-zinc-900 text-sm font-semibold text-white"
          >
            루틴 추가
          </button>
        </form>
      </section>

      <section>
        <h3 className="mb-3 font-semibold">등록한 루틴</h3>
        {routines.length === 0 ? (
          <p className="text-sm text-zinc-500">
            {filtered ? "이 카테고리에 등록한 루틴이 없어요." : "아직 등록한 루틴이 없어요."}
          </p>
        ) : (
          <div className="space-y-6">
            {groups.map((g) => (
              <div key={g.id ?? "none"}>
                {showHeadings && (
                  <h4 className="mb-2 flex items-baseline gap-2 text-sm font-semibold text-amber-900">
                    {g.name}
                    <span className="text-xs font-normal text-zinc-400">{g.items.length}개</span>
                  </h4>
                )}
                <ul className="space-y-2">
                  {g.items.map((r) => (
                  <li key={r.id} className="rounded-2xl bg-zinc-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`truncate font-medium ${r.active ? "" : "text-zinc-400"}`}>
                          {r.name}
                          {!r.active && <span className="ml-2 text-xs">(중단됨)</span>}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {daysText(r.repeat_days)}
                          {r.category_id && categoryName.get(r.category_id)
                            ? ` · ${categoryName.get(r.category_id)}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <form action={setRoutineActive}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="active" value={String(!r.active)} />
                          <button type="submit" className={`${smallButton} bg-zinc-200`}>
                            {r.active ? "중단" : "다시 시작"}
                          </button>
                        </form>
                        <form action={deleteRoutine}>
                          <input type="hidden" name="id" value={r.id} />
                          <button
                            type="submit"
                            className={`${smallButton} bg-red-50 text-red-600`}
                          >
                            삭제
                          </button>
                        </form>
                      </div>
                    </div>
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs text-zinc-500">수정</summary>
                      <form action={updateRoutine} className="mt-3 space-y-3">
                        <input type="hidden" name="id" value={r.id} />
                        <input
                          name="name"
                          required
                          maxLength={100}
                          defaultValue={r.name}
                          aria-label="루틴 이름"
                          className={`${field} w-full`}
                        />
                        <CategorySelect categories={categories} value={r.category_id} />
                        <DayPicker selected={r.repeat_days} />
                        <button
                          type="submit"
                          className="h-10 w-full rounded-xl bg-zinc-900 text-sm font-semibold text-white"
                        >
                          저장
                        </button>
                      </form>
                    </details>
                  </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-zinc-400">
          삭제하면 그 루틴의 수행 기록도 함께 지워져요. 기록을 남기려면 &lsquo;중단&rsquo;을 쓰세요.
        </p>
      </section>

      <section>
        <h3 className="mb-3 font-semibold">카테고리</h3>
        <form action={createCategory} className="flex gap-2">
          <input
            name="name"
            maxLength={50}
            placeholder="카테고리 이름 (예: 건강)"
            aria-label="카테고리 이름"
            className={`${field} flex-1`}
          />
          <button type="submit" className="h-11 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white">
            추가
          </button>
        </form>
        {categories.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {categories.map((c) => (
              <li key={c.id}>
                <form
                  action={deleteCategory}
                  className="flex items-center gap-1 rounded-full bg-zinc-100 py-1 pl-3 pr-1 text-sm"
                >
                  <input type="hidden" name="id" value={c.id} />
                  {c.name}
                  <button
                    type="submit"
                    aria-label={`${c.name} 카테고리 삭제`}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 hover:text-red-500"
                  >
                    ✕
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
