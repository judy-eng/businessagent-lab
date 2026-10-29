"use client";

import Link from "next/link";
import { useState } from "react";
import { ChecklistCard, type CheckItem } from "../calendar/checklist-card";
import { QuickEmotion } from "./quick-emotion";

type FolderKey = "routine" | "schedule" | "emotion" | "todo";

const COLORS = {
  routine: ["#fdf1bd", "#f7d576"],
  schedule: ["#d6e9fb", "#a8d1f6"],
  emotion: ["#fcdcef", "#efb3dc"],
  todo: ["#e6defc", "#c8bbf4"],
  diary: ["#fde4cc", "#f8bc91"],
} as const;

function folderStyle(key: keyof typeof COLORS) {
  return { ["--from" as string]: COLORS[key][0], ["--to" as string]: COLORS[key][1] };
}

function FolderButton({
  k,
  title,
  info,
  open,
  onToggle,
}: {
  k: FolderKey;
  title: string;
  info: string;
  open: FolderKey | null;
  onToggle: (key: FolderKey) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(k)}
      aria-expanded={open === k}
      className="folder-card w-full cursor-pointer text-left"
      style={folderStyle(k)}
    >
      <span className="text-lg font-bold text-zinc-900">{title}</span>
      <span className="mt-0.5 text-sm text-zinc-600">{info}</span>
    </button>
  );
}

// 폴더 카드를 누르면 그 자리에서 바로 처리할 수 있는 칸이 아래에 열린다.
// (루틴·일정·Todo는 체크, 감정은 점수 빠른 기록) 같은 카드를 다시 누르면 닫힌다.
export function HomeFolders({
  routines,
  schedules,
  todos,
  emotionCount,
  diaryWritten,
  onToggleRoutine,
  onToggleSchedule,
  onToggleTodo,
  onRecordEmotion,
}: {
  routines: CheckItem[];
  schedules: CheckItem[];
  todos: CheckItem[];
  emotionCount: number;
  diaryWritten: boolean;
  onToggleRoutine: (id: string, done: boolean) => Promise<void>;
  onToggleSchedule: (id: string, done: boolean) => Promise<void>;
  onToggleTodo: (id: string, done: boolean) => Promise<void>;
  onRecordEmotion: (score: number, typeIds: number[], cause: string) => Promise<void>;
}) {
  const [open, setOpen] = useState<FolderKey | null>(null);
  const toggle = (key: FolderKey) => setOpen((cur) => (cur === key ? null : key));
  const doneInfo = (items: CheckItem[]) =>
    items.length ? `${items.filter((i) => i.done).length}/${items.length} 완료` : "없음";

  const panel =
    open === "routine" ? (
      <ChecklistCard
        title="루틴"
        href="/routine"
        tone="bg-white/70"
        accent="accent-amber-600"
        items={routines}
        onToggle={onToggleRoutine}
      />
    ) : open === "schedule" ? (
      <ChecklistCard
        title="일정"
        href="/schedule"
        tone="bg-white/70"
        accent="accent-sky-600"
        showTime
        items={schedules}
        onToggle={onToggleSchedule}
      />
    ) : open === "emotion" ? (
      <QuickEmotion onRecord={onRecordEmotion} />
    ) : null;

  return (
    <>
      {/* 한 줄: 루틴 / 일정 / 감정 */}
      <div className="mt-2 grid grid-cols-3 gap-3">
        <FolderButton k="routine" title="루틴" info={doneInfo(routines)} open={open} onToggle={toggle} />
        <FolderButton k="schedule" title="일정" info={schedules.length ? `${schedules.length}개` : "없음"} open={open} onToggle={toggle} />
        <FolderButton k="emotion" title="감정" info={emotionCount ? `기록 ${emotionCount}회` : "기록 없음"} open={open} onToggle={toggle} />
      </div>
      {panel && <div className="mt-4">{panel}</div>}

      {/* 그 아래 줄: Todo */}
      <FolderButton k="todo" title="Todo" info={doneInfo(todos)} open={open} onToggle={toggle} />
      {open === "todo" && (
        <div className="mt-4">
          <ChecklistCard
            title="Todo"
            href="/todo"
            tone="bg-white/70"
            accent="accent-violet-600"
            items={todos}
            onToggle={onToggleTodo}
          />
        </div>
      )}

      {/* 맨 아래: 일기 (일기는 쓰는 화면으로 이동) */}
      <Link href="/diary" className="folder-card" style={folderStyle("diary")}>
        <span className="text-lg font-bold text-zinc-900">일기</span>
        <span className="mt-0.5 text-sm text-zinc-600">{diaryWritten ? "작성함" : "아직 안 씀"}</span>
      </Link>
    </>
  );
}
