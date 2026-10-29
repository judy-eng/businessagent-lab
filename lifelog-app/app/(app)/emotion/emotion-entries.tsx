import {
  GROUP_COLORS,
  scoreColor,
  type EmotionType,
} from "@/lib/emotion";
import type { EmotionEntry } from "@/lib/queries";
import { SLOT_LABELS } from "@/lib/time-slot";
import { deleteEmotion } from "./actions";

function timeText(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

export function EmotionEntries({
  entries,
  types,
  timeZone,
}: {
  entries: EmotionEntry[];
  types: EmotionType[];
  timeZone: string;
}) {
  const byId = new Map(types.map((t) => [t.id, t]));

  if (entries.length === 0) {
    return (
      <p className="rounded-2xl bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
        기록된 감정이 없습니다.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {entries.map((e) => (
        <li key={e.id} className="rounded-2xl bg-zinc-50 p-4">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
              style={{ backgroundColor: scoreColor(e.score) }}
            >
              {e.score}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {SLOT_LABELS[e.time_slot]}{" "}
                <span className="font-normal text-zinc-400">
                  {timeText(e.recorded_at, timeZone)}
                </span>
              </p>
              {e.typeIds.length > 0 && (
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {e.typeIds.map((id) => {
                    const t = byId.get(id);
                    if (!t) return null;
                    const c = GROUP_COLORS[t.grp];
                    return (
                      <li
                        key={id}
                        className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: c.bg, color: c.text }}
                      >
                        {t.name}
                      </li>
                    );
                  })}
                </ul>
              )}
              {e.cause && (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-600">
                  {e.cause}
                </p>
              )}
            </div>
            <form action={deleteEmotion}>
              <input type="hidden" name="id" value={e.id} />
              <button
                type="submit"
                aria-label="이 감정 기록 삭제"
                className="px-1 text-zinc-400 hover:text-red-500"
              >
                ✕
              </button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}
