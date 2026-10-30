// 요약 버튼의 반짝이는 별 아이콘 (참고 사진 `AI 아이콘.jpg`의 별 3개. AI를 쓰지 않으므로 AI 글자는 뺐다)
export function SummaryIcon({ size = 18 }: { size?: number }) {
  const star = (cx: number, cy: number, r: number) =>
    `M${cx} ${cy - r}Q${cx + r * 0.18} ${cy - r * 0.18} ${cx + r} ${cy}Q${cx + r * 0.18} ${cy + r * 0.18} ${cx} ${cy + r}Q${cx - r * 0.18} ${cy + r * 0.18} ${cx - r} ${cy}Q${cx - r * 0.18} ${cy - r * 0.18} ${cx} ${cy - r}Z`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={star(10.5, 13.5, 8)} />
      <path d={star(19.2, 5.2, 3.6)} />
      <path d={star(20.4, 17.6, 2.4)} />
    </svg>
  );
}
