"use client";

import { useState, useTransition } from "react";
import {
  CUSTOM_EMOTION_NAME_MAX,
  GROUP_COLORS,
  GROUP_ORDER,
  type EmotionGroup,
  type EmotionType,
} from "@/lib/emotion";
import {
  addEmotion,
  createEmotionType,
  deleteEmotionType,
  renameEmotionType,
} from "./actions";
import { BubbleCloud } from "./bubble-cloud";
import { ScoreSlider } from "./score-slider";

// 감정 직접 추가: 카테고리(3개) 중 하나 + 감정 이름 + 추가 버튼
function CustomEmotionPanel({ onDone }: { onDone: () => void }) {
  const [grp, setGrp] = useState<EmotionGroup | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!grp) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await createEmotionType(grp, name);
        if (result.ok) onDone();
        else setError(result.error);
      } catch {
        setError("저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
      }
    });
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto mt-5 max-w-sm space-y-3 rounded-2xl bg-white/80 p-4 shadow-sm"
    >
      <fieldset>
        <legend className="mb-2 text-xs font-medium text-zinc-500">카테고리</legend>
        <div className="grid grid-cols-3 gap-2">
          {GROUP_ORDER.map((g) => {
            const c = GROUP_COLORS[g];
            const on = grp === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => setGrp(g)}
                aria-pressed={on}
                style={on ? { backgroundColor: c.bg, color: c.text } : undefined}
                className={`flex h-10 items-center justify-center gap-1.5 rounded-xl text-sm font-medium transition ${
                  on ? "ring-2 ring-zinc-800/70" : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {!on && (
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.bg }} />
                )}
                {c.label}
              </button>
            );
          })}
        </div>
      </fieldset>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={CUSTOM_EMOTION_NAME_MAX}
        placeholder="감정 이름 (예: 뭉클함)"
        aria-label="감정 이름"
        className="h-11 w-full rounded-xl bg-zinc-100 px-3 text-sm outline-none focus:ring-2 focus:ring-violet-300"
      />
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending || !grp || !name.trim()}
        className="h-11 w-full rounded-xl bg-zinc-900 text-sm font-semibold text-white disabled:opacity-40"
      >
        {pending ? "추가 중..." : "추가"}
      </button>
    </form>
  );
}

// 내가 추가한 감정 관리: 이름 고치기, 삭제
function CustomEmotionRow({ emotion }: { emotion: EmotionType }) {
  const [mode, setMode] = useState<"view" | "edit" | "confirm">("view");
  const [name, setName] = useState(emotion.name);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const c = GROUP_COLORS[emotion.grp];

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (result.ok) setMode("view");
        else setError(result.error);
      } catch {
        setError("저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
      }
    });
  }

  const small = "h-8 rounded-lg px-3 text-xs font-medium disabled:opacity-40";

  return (
    <li className="rounded-xl bg-white/80 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: c.bg }} />
        {mode === "edit" ? (
          <form
            className="flex min-w-0 flex-1 items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => renameEmotionType(emotion.id, name));
            }}
          >
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={CUSTOM_EMOTION_NAME_MAX}
              aria-label="감정 이름"
              className="h-8 min-w-0 flex-1 rounded-lg bg-zinc-100 px-2 text-sm outline-none focus:ring-2 focus:ring-violet-300"
            />
            <button type="submit" disabled={pending || !name.trim()} className={`${small} bg-zinc-900 text-white`}>
              저장
            </button>
            <button
              type="button"
              onClick={() => { setMode("view"); setName(emotion.name); setError(null); }}
              className={`${small} bg-zinc-100`}
            >
              취소
            </button>
          </form>
        ) : (
          <>
            <span className="min-w-0 flex-1 truncate text-sm">{emotion.name}</span>
            {mode === "view" && (
              <>
                <button type="button" onClick={() => setMode("edit")} className={`${small} bg-zinc-100`}>
                  이름 고치기
                </button>
                <button type="button" onClick={() => setMode("confirm")} className={`${small} bg-red-50 text-red-600`}>
                  삭제
                </button>
              </>
            )}
          </>
        )}
      </div>
      {mode === "confirm" && (
        <div className="mt-2 rounded-lg bg-red-50 p-3 text-xs text-zinc-700">
          <p>
            &lsquo;{emotion.name}&rsquo;을(를) 삭제할까요? 지난 기록에 이미 쓴 감정이면 버블 판에서만 사라지고, 지난 기록에는 이름이 그대로 남아요.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => deleteEmotionType(emotion.id))}
              className={`${small} bg-red-600 text-white`}
            >
              {pending ? "삭제 중..." : "삭제"}
            </button>
            <button type="button" onClick={() => { setMode("view"); setError(null); }} className={`${small} bg-white`}>
              취소
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      )}
    </li>
  );
}

function CustomEmotionManager({ customs }: { customs: EmotionType[] }) {
  if (customs.length === 0) return null;
  return (
    <details className="mt-5 rounded-2xl bg-white/50 p-3">
      <summary className="cursor-pointer text-sm font-medium text-zinc-700">
        내가 추가한 감정 관리 ({customs.length})
      </summary>
      <ul className="mt-3 space-y-2">
        {customs.map((e) => (
          <CustomEmotionRow key={`${e.id}:${e.name}`} emotion={e} />
        ))}
      </ul>
    </details>
  );
}

export const CAUSE_MAX_LENGTH = 2000;

export function EmotionForm({ types }: { types: EmotionType[] }) {
  const [score, setScore] = useState(5);
  const [cause, setCause] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [added, setAdded] = useState(false);

  function toggle(id: number) {
    setDone(false);
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await addEmotion(score, chosen, cause);
        setSelected([]);
        setScore(5);
        setCause("");
        setDone(true);
      } catch {
        setError("저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
      }
    });
  }

  const names = new Map(types.map((t) => [t.id, t.name]));
  // 삭제해서 사라진 감정이 선택되어 있으면 제외한다
  const chosen = selected.filter((id) => names.has(id));

  return (
    <section className="mt-6">
      <h2 className="font-semibold">지금 기분은 어때요?</h2>
      <ScoreSlider score={score} onChange={(v) => { setDone(false); setScore(v); }} />

      <div className="mt-8">
        <label htmlFor="cause" className="block font-semibold">
          감정의 원인은 어떤걸까요?
        </label>
        <p className="mt-1 text-sm text-zinc-500">
          자유롭게 적어주세요. 감정에 정답은 없습니다!
        </p>
        <textarea
          id="cause"
          value={cause}
          onChange={(e) => { setDone(false); setCause(e.target.value); }}
          rows={3}
          maxLength={CAUSE_MAX_LENGTH}
          placeholder="예: 발표가 생각보다 잘 끝나서 후련했어요."
          className="mt-3 w-full resize-y rounded-2xl bg-zinc-100 p-4 leading-relaxed outline-none focus:ring-2 focus:ring-violet-300"
        />
      </div>

      <h2 className="mb-1 mt-10 font-semibold">어떤 감정이 드나요?</h2>
      <p className="mb-4 text-xs text-zinc-400">여러 개를 골라도 괜찮아요. 고르지 않아도 기록할 수 있어요.</p>

      <div className="bubble-field overflow-hidden rounded-3xl p-5">
        <div className="mx-auto mb-4 flex w-fit justify-center gap-4 rounded-full bg-white/70 px-4 py-1.5 text-xs text-zinc-600 shadow-sm">
          {Object.values(GROUP_COLORS).map((g) => (
            <span key={g.label} className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: g.bg }} />
              {g.label}
            </span>
          ))}
        </div>
        <BubbleCloud
          types={types}
          selected={chosen}
          onToggle={toggle}
          onAddClick={() => { setAdded(false); setAddOpen((v) => !v); }}
          addOpen={addOpen}
        />
        {addOpen && (
          <CustomEmotionPanel
            onDone={() => { setAddOpen(false); setAdded(true); }}
          />
        )}
        <CustomEmotionManager customs={types.filter((t) => t.isCustom)} />
        {added && (
          <p role="status" className="mt-4 text-center text-sm text-zinc-600">
            감정을 추가했어요. 버블 판에서 찾아보세요!
          </p>
        )}
      </div>

      <div className="sticky bottom-4 mt-8 rounded-3xl bg-zinc-900 p-3 text-white shadow-xl">
        <p className="truncate px-2 pb-2 text-sm text-zinc-300">
          {chosen.length === 0
            ? "고른 감정이 없어요"
            : chosen.map((id) => names.get(id)).join(", ")}
        </p>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="h-12 w-full rounded-2xl bg-white text-base font-semibold text-zinc-900 disabled:opacity-50"
        >
          {pending ? "기록 중..." : `${score}점 기록하기`}
        </button>
      </div>

      {done && <p role="status" className="mt-3 text-center text-sm text-emerald-600">기록했어요</p>}
      {error && <p role="alert" className="mt-3 text-center text-sm text-red-600">{error}</p>}
    </section>
  );
}
