import Link from "next/link";
import { GROUP_COLORS, scoreColor, type EmotionType } from "@/lib/emotion";
import { formatKorean } from "@/lib/dates";
import {
  getDayMemo,
  getDiary,
  getEmotionEntries,
  getRoutineChecklist,
  getSchedules,
  getTodos,
} from "@/lib/queries";
import { SLOT_LABELS } from "@/lib/time-slot";
import { toggleSchedule } from "../schedule/actions";
import { toggleTodo } from "../todo/actions";
import { toggleRoutineForDate } from "./actions";
import { ChecklistCard } from "./checklist-card";

function timeText(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

function Card({
  title,
  summary,
  href,
  tone,
  children,
}: {
  title: string;
  summary?: string;
  href: string;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-2xl p-4 ${tone}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          {title}
          {summary && <span className="ml-2 text-sm font-normal text-zinc-500">{summary}</span>}
        </h3>
        <Link href={href} className="text-xs text-zinc-500 underline underline-offset-2">
          열기
        </Link>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

const empty = <p className="text-sm text-zinc-400">기록이 없어요</p>;

// 선택한 날짜의 기록 모아보기. 각 카드의 '열기'로 해당 화면에서 확인하고 추가할 수 있다.
export async function DayDetail({
  date,
  timeZone,
  types,
}: {
  date: string;
  timeZone: string;
  types: EmotionType[];
}) {
  const [todos, routines, schedules, emotions, diary, memo] = await Promise.all([
    getTodos(date),
    getRoutineChecklist(date, timeZone),
    getSchedules(date),
    getEmotionEntries(date),
    getDiary(date),
    getDayMemo(date),
  ]);
  const typeById = new Map(types.map((t) => [t.id, t]));
  const q = `?date=${date}`;

  return (
    <div className="mt-8">
      <h2 className="mb-3 text-lg font-bold">{formatKorean(date)}</h2>
      <div className="space-y-3">
        <ChecklistCard
          title="일정"
          href={`/schedule${q}`}
          tone="bg-sky-100/60"
          accent="accent-sky-600"
          showTime
          items={schedules.map((x) => ({ id: x.id, label: x.title, done: x.done, time: x.time }))}
          onToggle={toggleSchedule}
        />

        <ChecklistCard
          title="Todo"
          href={`/todo${q}`}
          tone="bg-violet-100/60"
          accent="accent-violet-600"
          items={todos.map((x) => ({ id: x.id, label: x.title, done: x.done }))}
          onToggle={toggleTodo}
        />

        <ChecklistCard
          title="루틴"
          href={`/routine${q}`}
          tone="bg-amber-100/60"
          accent="accent-amber-600"
          items={routines.map((x) => ({ id: x.id, label: x.name, done: x.done }))}
          onToggle={toggleRoutineForDate.bind(null, date)}
        />

        <Card title="감정" summary={emotions.length ? `${emotions.length}번 기록` : undefined} href={`/emotion${q}`} tone="bg-zinc-100/70">
          {emotions.length === 0 ? <p className="text-sm text-zinc-400">기록된 감정이 없습니다.</p> : (
            <ul className="space-y-3">
              {emotions.map((e) => (
                <li key={e.id} className="flex gap-3">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: scoreColor(e.score) }}
                  >
                    {e.score}
                  </span>
                  <div className="min-w-0 text-sm">
                    <p className="font-medium">
                      {SLOT_LABELS[e.time_slot]}{" "}
                      <span className="font-normal text-zinc-400">{timeText(e.recorded_at, timeZone)}</span>
                    </p>
                    {e.typeIds.length > 0 && (
                      <ul className="mt-1 flex flex-wrap gap-1">
                        {e.typeIds.map((id) => {
                          const t = typeById.get(id);
                          if (!t) return null;
                          const c = GROUP_COLORS[t.grp];
                          return (
                            <li key={id} className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: c.bg, color: c.text }}>
                              {t.name}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {e.cause && <p className="mt-1 whitespace-pre-wrap text-zinc-600">{e.cause}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="한 줄" href="/memos" tone="bg-emerald-100/50">
          {memo ? <p className="text-sm leading-relaxed text-zinc-700">{memo}</p> : empty}
        </Card>

        <Card title="일기" href={`/diary${q}`} tone="bg-orange-100/60">
          {diary ? (
            <p className="line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">{diary}</p>
          ) : empty}
        </Card>
      </div>
    </div>
  );
}
