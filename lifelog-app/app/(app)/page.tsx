import { Suspense } from "react";
import { logout } from "@/app/login/actions";
import { ProgressRing } from "@/components/progress-ring";
import { SearchBar } from "@/components/search-bar";
import { formatKorean } from "@/lib/dates";
import {
  getDayMemo,
  getDiary,
  getEmotionEntries,
  getEmotionMarks,
  getEmotionTypes,
  getRoutineChecklist,
  getSchedules,
  getTodos,
  resolveDate,
} from "@/lib/queries";
import { buildSummary } from "@/lib/summary";
import { addDays, mondayOf } from "@/lib/dates";
import { toggleRoutineForDate } from "./calendar/actions";
import { vapidPublicKey } from "@/lib/push";
import { isEmotionPromptTime } from "@/lib/time-slot";
import { NotificationSettings } from "./reminder/notification-settings";
import { addEmotion } from "./emotion/actions";
import { HomeFolders } from "./home/home-folders";
import { WeekBand } from "./home/week-band";
import { MemoForm } from "./memo-form";
import { toggleSchedule } from "./schedule/actions";
import { SummaryButton } from "./summary/summary-button";
import { toggleTodo } from "./todo/actions";

// 진행 막대 한 줄
function Bar({ label, done, total, color }: { label: string; done: number; total: number; color: string }) {
  const percent = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs text-zinc-600">
      <span className="w-9 shrink-0">{label}</span>
      <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/70">
        <span className="block h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: color }} />
      </span>
      <span className="w-12 shrink-0 text-right tabular-nums">{total ? `${done}/${total}` : "없음"}</span>
    </div>
  );
}

async function HomeContent() {
  const { today, timeZone } = await resolveDate(undefined);
  const weekStart = mondayOf(today);

  const [marks, types, todos, routines, schedules, emotions, diary, memo] = await Promise.all([
    getEmotionMarks(weekStart, addDays(weekStart, 6)),
    getEmotionTypes({ includeHidden: true }),
    getTodos(today),
    getRoutineChecklist(today, timeZone),
    getSchedules(today),
    getEmotionEntries(today),
    getDiary(today),
    getDayMemo(today),
  ]);
  const groupOf = new Map(types.map((t) => [t.id, t.grp]));

  const summary = buildSummary({ todos, routines, scores: emotions.map((e) => e.score) });

  // 오늘 진행률: Todo, 루틴, 일정을 합쳐서 체크한 비율
  const all = [...todos, ...routines, ...schedules];
  const percent = all.length ? Math.round((all.filter((i) => i.done).length / all.length) * 100) : null;
  const count = (items: { done: boolean }[]) => ({ done: items.filter((i) => i.done).length, total: items.length });

  return (
    <>
      {/* 과거 기록 검색: 감정 이름을 검색하면 그 감정을 고른 날이 나온다 */}
      <div className="mb-6">
        <SearchBar />
      </div>

      {/* 이번 주 한 줄 띠 */}
      <WeekBand today={today} marks={marks} groupOf={groupOf} />

      {/* 오늘의 요약 카드: 진행률 + 한 줄 요약 + 직접 쓰는 한 줄 메모 */}
      <section className="mt-6 rounded-3xl bg-gradient-to-br from-violet-50 to-sky-50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-x-3">
          <p className="pt-2 text-xs text-zinc-500">{formatKorean(today)} · 오늘 진행률</p>
          {/* '한줄 요약' 버튼: 한 줄 요약 영역의 오른쪽 끝. 누르면 오늘 숫자로 만든 요약이 나온다 (AI 없이 무료) */}
          <SummaryButton kind="daily" target={today} placement="inline" />
        </div>
        <div className="mt-2 flex items-center gap-4">
          <ProgressRing percent={percent} />
          <p className="min-w-0 flex-1 text-base font-semibold leading-snug">{summary}</p>
        </div>
        <div className="mt-4 space-y-1.5">
          <Bar label="Todo" {...count(todos)} color="#8B729C" />
          <Bar label="루틴" {...count(routines)} color="#e0a526" />
          <Bar label="일정" {...count(schedules)} color="#4f9fd8" />
        </div>
        <MemoForm key={memo} date={today} memo={memo} />
        <p className="mt-1 text-right text-xs">
          <a href="/memos" className="text-zinc-500 underline underline-offset-2">
            지난 한 줄 모아보기
          </a>
        </p>
      </section>

      {/* 폴더: 루틴 / 일정 / 감정 → Todo → 일기. 눌러서 그 자리에서 바로 처리한다 */}
      <HomeFolders
        routines={routines.map((r) => ({ id: r.id, label: r.name, done: r.done }))}
        schedules={schedules.map((s) => ({ id: s.id, label: s.title, done: s.done, time: s.time }))}
        todos={todos.map((t) => ({ id: t.id, label: t.title, done: t.done }))}
        emotionCount={emotions.length}
        diaryWritten={!!diary}
        // 오후 7시 이후, 오늘 감정 기록이 하나도 없을 때만 질문을 보여준다 (기록하면 사라진다)
        emotionPrompt={emotions.length === 0 && isEmotionPromptTime(new Date(), timeZone)}
        onToggleRoutine={toggleRoutineForDate.bind(null, today)}
        onToggleSchedule={toggleSchedule}
        onToggleTodo={toggleTodo}
        onRecordEmotion={addEmotion}
      />

      <NotificationSettings publicKey={vapidPublicKey()} />

      <form action={logout} className="mt-10 text-center">
        <button type="submit" className="text-xs text-zinc-400 underline underline-offset-2">
          나가기
        </button>
      </form>
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<p className="mt-10 text-center text-zinc-400">불러오는 중...</p>}>
      <HomeContent />
    </Suspense>
  );
}
