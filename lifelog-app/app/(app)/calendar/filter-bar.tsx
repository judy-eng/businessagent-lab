import Link from "next/link";
import { GROUP_COLORS, GROUP_ORDER, type EmotionType } from "@/lib/emotion";
import { FilterSelect } from "./filter-select";
import { calendarHref, type CalendarOpts } from "./options";

// 감정 필터: 그룹(긍정·중립·부정)이나 특정 감정을 고르면 그 감정이 있는 날만 강조된다
export function FilterBar({
  opts,
  types,
  matchedDays,
}: {
  opts: CalendarOpts;
  types: EmotionType[];
  matchedDays: number | null; // 필터가 켜져 있을 때 해당하는 날 수
}) {
  const { filter } = opts;
  const chip = (active: boolean) =>
    `flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition ${
      active ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
    }`;

  const options = types.map((t) => ({
    href: calendarHref(opts, { filter: `e:${t.id}` }),
    label: t.name,
    group: GROUP_COLORS[t.grp].label,
  }));
  // 그룹 순서대로 정렬되어 있지 않을 수 있으니 순서를 맞춘다
  options.sort(
    (a, b) =>
      GROUP_ORDER.findIndex((g) => GROUP_COLORS[g].label === a.group) -
      GROUP_ORDER.findIndex((g) => GROUP_COLORS[g].label === b.group),
  );
  const current = filter?.startsWith("e:") ? calendarHref(opts, { filter }) : null;

  return (
    <section className="mt-5" aria-label="감정 필터">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={calendarHref(opts, { filter: null })} className={chip(filter === null)}>
          전체
        </Link>
        {GROUP_ORDER.map((g) => {
          const c = GROUP_COLORS[g];
          return (
            <Link
              key={g}
              href={calendarHref(opts, { filter: g })}
              aria-current={filter === g ? "true" : undefined}
              className={chip(filter === g)}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.bg }} />
              {c.label}
            </Link>
          );
        })}
        <FilterSelect options={options} current={current} clearHref={calendarHref(opts, { filter: null })} />
      </div>
      {filter && matchedDays !== null && (
        <p className="mt-2 text-sm text-zinc-500">
          선택한 감정이 있는 날 <strong className="text-zinc-800">{matchedDays}일</strong>
        </p>
      )}
    </section>
  );
}
