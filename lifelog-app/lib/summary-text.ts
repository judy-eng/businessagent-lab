// 규칙 기반 요약 문장 만들기. AI를 쓰지 않고 숫자로만 문장을 만든다. (무료, 항상 같은 결과)
// 원인을 단정하지 않는다: 숫자와 비교만 말하고 "때문에" 같은 표현은 쓰지 않는다.

export type Count = { done: number; total: number };

export type DailyFacts = {
  date: string;
  weekday: string; // "목요일"
  isToday: boolean;
  todo: Count;
  schedule: Count;
  routine: Count;
  routineByCategory: { name: string; done: number; total: number }[];
  emotions: { slot: string; score: number; names: string[] }[]; // 시간 순서
};

export type WeeklyFacts = {
  label: string; // "10월 다섯째 주"
  start: string;
  end: string;
  days: {
    date: string;
    weekday: string;
    todo: Count;
    schedule: Count;
    routine: Count;
    emotionCount: number;
    emotionAverage: number | null;
  }[];
  emotion: {
    entries: number;
    average: number | null;
    groups: { positive: number; neutral: number; negative: number }; // 고른 감정 개수
    top: { name: string; group: string; count: number }[]; // 많이 고른 감정
    bySlot: { slot: string; count: number; average: number | null }[];
  };
  previous: { todoRate: number | null; routineRate: number | null; emotionAverage: number | null; emotionCount: number } | null;
};

const pct = (d: number, t: number) => Math.round((d / t) * 100);
const num = (n: number) => String(Number(n.toFixed(1)));

// 기록이 이만큼보다 적으면 "참고만 해주세요"를 덧붙인다
export const FEW_EMOTION_ENTRIES = 3;

function parts(f: Pick<DailyFacts, "todo" | "schedule" | "routine">) {
  const out: string[] = [];
  if (f.todo.total) out.push(`Todo는 ${f.todo.total}개 중 ${f.todo.done}개(${pct(f.todo.done, f.todo.total)}%) 완료`);
  if (f.schedule.total) out.push(`일정은 ${f.schedule.total}개 중 ${f.schedule.done}개 완료`);
  if (f.routine.total) out.push(`루틴은 ${f.routine.total}번 중 ${f.routine.done}번(${pct(f.routine.done, f.routine.total)}%) 완료`);
  return out;
}

export function dailySummaryText(f: DailyFacts) {
  const label = f.isToday ? "오늘" : `${Number(f.date.slice(5, 7))}월 ${Number(f.date.slice(8, 10))}일`;
  const sentences: string[] = [];

  const tasks = parts(f);
  if (tasks.length) sentences.push(`${label}은 ${tasks.join(", ")}예요.`);

  const n = f.emotions.length;
  if (n === 0) {
    sentences.push("감정 기록은 아직 없어요.");
  } else {
    const avg = f.emotions.reduce((a, e) => a + e.score, 0) / n;
    const names = [...new Set(f.emotions.flatMap((e) => e.names))];
    let s = `감정은 ${n}번 기록했고 평균 ${num(avg)}점이에요`;
    if (names.length) s += ` (고른 감정: ${names.join(", ")})`;
    sentences.push(`${s}.`);
    if (n < FEW_EMOTION_ENTRIES) sentences.push("기록이 적어서 참고만 해주세요.");
  }
  return sentences.join(" ");
}

export function weeklySummaryText(f: WeeklyFacts) {
  const e = f.emotion;
  const sentences: string[] = [];

  // 1. 감정 평균과 지난주 비교
  if (e.entries > 0 && e.average !== null) {
    let s = `${f.label}에는 감정을 ${e.entries}번 기록했고 평균 ${num(e.average)}점이에요`;
    const prev = f.previous;
    if (prev && prev.emotionCount > 0 && prev.emotionAverage !== null) {
      const diff = Math.round((e.average - prev.emotionAverage) * 10) / 10;
      s += diff === 0 ? " (지난주와 같아요)" : ` (지난주 ${num(prev.emotionAverage)}점보다 ${num(Math.abs(diff))}점 ${diff > 0 ? "높아요" : "낮아요"})`;
    }
    sentences.push(`${s}.`);
  } else {
    sentences.push(`${f.label}에는 감정 기록이 없어요.`);
  }

  // 2. Todo·일정·루틴
  const sum = (k: "todo" | "schedule" | "routine") => ({
    done: f.days.reduce((a, d) => a + d[k].done, 0),
    total: f.days.reduce((a, d) => a + d[k].total, 0),
  });
  const todo = sum("todo");
  const schedule = sum("schedule");
  const routine = sum("routine");
  const tasks: string[] = [];
  if (todo.total) {
    const prev = f.previous?.todoRate;
    tasks.push(`Todo는 ${todo.total}개 중 ${todo.done}개(${pct(todo.done, todo.total)}%) 완료${prev != null ? `(지난주 ${prev}%)` : ""}`);
  }
  if (schedule.total) tasks.push(`일정은 ${schedule.total}개 중 ${schedule.done}개 완료`);
  if (routine.total) {
    const prev = f.previous?.routineRate;
    tasks.push(`루틴은 ${routine.total}번 중 ${routine.done}번(${pct(routine.done, routine.total)}%) 완료${prev != null ? `(지난주 ${prev}%)` : ""}`);
  }
  if (tasks.length) sentences.push(`${tasks.join(", ")}예요.`);

  // 3. 많이 고른 감정, 점수가 높았던 요일과 낮았던 요일 (기록이 있는 날이 3일 이상일 때만)
  if (e.top.length) sentences.push(`가장 많이 고른 감정: ${e.top.slice(0, 3).map((t) => `${t.name}(${t.count}번)`).join(", ")}.`);
  const rated = f.days.filter((d) => d.emotionAverage !== null);
  if (rated.length >= 3) {
    const hi = rated.reduce((a, b) => (b.emotionAverage! > a.emotionAverage! ? b : a));
    const lo = rated.reduce((a, b) => (b.emotionAverage! < a.emotionAverage! ? b : a));
    if (hi.emotionAverage !== lo.emotionAverage) {
      sentences.push(`감정 점수가 가장 높았던 요일은 ${hi.weekday}요일(${num(hi.emotionAverage!)}점), 가장 낮았던 요일은 ${lo.weekday}요일(${num(lo.emotionAverage!)}점)이에요.`);
    }
  }

  if (e.entries > 0 && e.entries < FEW_EMOTION_ENTRIES) sentences.push(`감정 기록이 ${e.entries}번뿐이라 참고만 해주세요.`);
  return sentences.join(" ");
}
