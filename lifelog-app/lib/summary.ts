// 홈의 규칙 기반 한 줄 요약. 예: "Todo 2/5 완료 · 루틴 3/4 · 감정 7점"
// AI를 쓰지 않고, 그날의 수치만 문장으로 만든다. (기획안: 인과를 단정하지 않는다)
export function buildSummary({
  todos,
  routines,
  scores,
}: {
  todos: { done: boolean }[];
  routines: { done: boolean }[];
  scores: number[];
}) {
  const count = (items: { done: boolean }[]) => items.filter((i) => i.done).length;

  const todo = todos.length ? `Todo ${count(todos)}/${todos.length} 완료` : "Todo 없음";
  const routine = routines.length ? `루틴 ${count(routines)}/${routines.length}` : "루틴 없음";

  let emotion = "감정 기록 없음";
  if (scores.length === 1) {
    emotion = `감정 ${scores[0]}점`;
  } else if (scores.length > 1) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    emotion = `감정 평균 ${Number(avg.toFixed(1))}점`;
  }
  return [todo, routine, emotion].join(" · ");
}
