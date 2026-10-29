// 검색어를 하이라이트하기 위한 글 자르기. 서버와 화면 어디서든 쓸 수 있다.
export type TextPart = { text: string; match: boolean };

// LIKE 검색에서 특별한 뜻을 갖는 글자(%, _, \)를 그냥 글자로 취급하도록 바꾼다
export function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

// 글에서 검색어와 같은 부분을 표시한다 (대소문자 구분 없음).
// context를 주면 긴 글은 처음 일치하는 곳 앞뒤 context글자만 보여준다.
export function highlight(text: string, query: string, context = 0): TextPart[] {
  const q = query.trim();
  if (!q) return [{ text, match: false }];
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();

  let start = 0;
  let end = text.length;
  let prefix = false;
  let suffix = false;
  if (context > 0 && text.length > context * 2 + q.length) {
    const first = lower.indexOf(needle);
    if (first >= 0) {
      start = Math.max(0, first - context);
      end = Math.min(text.length, first + q.length + context);
      prefix = start > 0;
      suffix = end < text.length;
    } else {
      end = context * 2;
      suffix = true;
    }
  }

  const parts: TextPart[] = [];
  if (prefix) parts.push({ text: "…", match: false });
  let cursor = start;
  while (cursor < end) {
    const idx = lower.indexOf(needle, cursor);
    if (idx < 0 || idx >= end) {
      parts.push({ text: text.slice(cursor, end), match: false });
      break;
    }
    if (idx > cursor) parts.push({ text: text.slice(cursor, idx), match: false });
    parts.push({ text: text.slice(idx, idx + q.length), match: true });
    cursor = idx + q.length;
  }
  if (suffix) parts.push({ text: "…", match: false });
  return parts;
}
