import Link from "next/link";
import { GROUP_COLORS, scoreColor, type EmotionType } from "@/lib/emotion";
import type { Hit } from "@/lib/search";
import { highlight } from "@/lib/search-text";
import { SLOT_LABELS } from "@/lib/time-slot";

const BADGES = {
  emotion: { label: "감정", tone: "bg-pink-100/70", badge: "bg-pink-200 text-pink-900" },
  todo: { label: "Todo", tone: "bg-violet-100/60", badge: "bg-violet-200 text-violet-900" },
  schedule: { label: "일정", tone: "bg-sky-100/60", badge: "bg-sky-200 text-sky-900" },
  diary: { label: "일기", tone: "bg-orange-100/60", badge: "bg-orange-200 text-orange-900" },
  memo: { label: "한 줄", tone: "bg-emerald-100/50", badge: "bg-emerald-200 text-emerald-900" },
} as const;

const PAGES = { emotion: "/emotion", todo: "/todo", schedule: "/schedule", diary: "/diary", memo: "/calendar" } as const;

// 검색어와 맞는 부분을 노란 형광펜처럼 표시한다
export function Marked({ text, query, context = 0 }: { text: string; query: string; context?: number }) {
  return (
    <>
      {highlight(text, query, context).map((p, i) =>
        p.match ? (
          <mark key={i} className="rounded bg-yellow-200 px-0.5 text-inherit">
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

function timeText(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
}

// 검색 결과 한 개. 누르면 그 날짜의 해당 화면이 열린다.
export function HitCard({
  hit,
  query,
  typeById,
  timeZone,
}: {
  hit: Hit;
  query: string;
  typeById: Map<number, EmotionType>;
  timeZone: string;
}) {
  const b = BADGES[hit.kind];
  const href = `${PAGES[hit.kind]}?date=${hit.date}`;

  return (
    <Link href={href} className={`block rounded-2xl p-3.5 transition hover:brightness-95 ${b.tone}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${b.badge}`}>{b.label}</span>
        <div className="min-w-0 flex-1 text-sm leading-relaxed text-zinc-800">
          {hit.kind === "emotion" ? (
            <div className="flex gap-3">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: scoreColor(hit.score) }}
              >
                {hit.score}
              </span>
              <div className="min-w-0">
                <p className="font-medium">
                  {SLOT_LABELS[hit.slot]} <span className="font-normal text-zinc-400">{timeText(hit.recordedAt, timeZone)}</span>
                </p>
                {hit.typeIds.length > 0 && (
                  <ul className="mt-1 flex flex-wrap gap-1">
                    {hit.typeIds.map((id) => {
                      const t = typeById.get(id);
                      if (!t) return null;
                      const c = GROUP_COLORS[t.grp];
                      const matched = hit.matchedTypeIds.includes(id);
                      return (
                        <li
                          key={id}
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${matched ? "ring-2 ring-zinc-900" : "opacity-60"}`}
                          style={{ backgroundColor: c.bg, color: c.text }}
                        >
                          {t.name}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {hit.cause && (
                  <p className="mt-1 whitespace-pre-wrap text-zinc-600">
                    {hit.causeMatched ? <Marked text={hit.cause} query={query} context={60} /> : hit.cause}
                  </p>
                )}
              </div>
            </div>
          ) : hit.kind === "schedule" ? (
            <p className={hit.done ? "text-zinc-500" : ""}>
              {hit.time && <span className="mr-2 tabular-nums text-sky-900">{hit.time.slice(0, 5)}</span>}
              <Marked text={hit.text} query={query} />
              {hit.done && <span className="ml-2 text-xs text-zinc-400">완료</span>}
            </p>
          ) : hit.kind === "todo" ? (
            <p className={hit.done ? "text-zinc-500" : ""}>
              <Marked text={hit.text} query={query} />
              {hit.done && <span className="ml-2 text-xs text-zinc-400">완료</span>}
            </p>
          ) : (
            <p className="whitespace-pre-wrap">
              <Marked text={hit.text} query={query} context={hit.kind === "diary" ? 60 : 0} />
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
