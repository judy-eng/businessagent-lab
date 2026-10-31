// 음성 입력 도우미: 말한 글을 일기 뒤에 이어 붙이고, 오류를 알기 쉬운 말로 바꾼다. (브라우저 없이도 시험할 수 있다)

export const DIARY_MAX_LENGTH = 20000;

// 이미 쓴 글(base) 뒤에 말한 글(spoken)을 이어 붙인다.
// - 말한 글이 비어 있으면 그대로 둔다
// - 원래 글이 있고 줄바꿈으로 끝나지 않으면 새 줄에서 시작한다 (한 번의 음성 입력 안에서는 공백으로 이어진다)
export function joinTranscript(base: string, spoken: string, continuation = false) {
  const text = spoken.replace(/\s+/g, " ").trim();
  if (!text) return base;
  if (!base) return text;
  if (continuation) return /\s$/.test(base) ? base + text : `${base} ${text}`;
  return /\n$/.test(base) ? base + text : `${base}\n${text}`;
}

// 글자 수 제한을 넘으면 앞에서부터 자른다
export function clampDiary(text: string) {
  return text.length > DIARY_MAX_LENGTH ? text.slice(0, DIARY_MAX_LENGTH) : text;
}

// 브라우저의 음성 인식 오류 코드를 알기 쉬운 말로 바꾼다. 반복해서 다시 시작하면 안 되는 오류(fatal)는 true.
export function voiceError(code: string): { message: string; fatal: boolean } {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return {
        message: "마이크 사용이 막혀 있어요. 주소창 왼쪽 자물쇠 아이콘에서 마이크를 '허용'으로 바꾼 뒤 새로고침해주세요.",
        fatal: true,
      };
    case "audio-capture":
      return { message: "마이크를 찾을 수 없어요. 마이크가 연결되어 있는지 확인해주세요.", fatal: true };
    case "network":
      return { message: "음성을 글자로 바꾸려면 인터넷 연결이 필요해요. 연결을 확인하고 다시 눌러주세요.", fatal: true };
    case "language-not-supported":
      return { message: "이 브라우저는 한국어 음성 인식을 지원하지 않아요.", fatal: true };
    case "no-speech":
      return { message: "말소리가 들리지 않았어요. 마이크에 가까이 대고 말해보세요.", fatal: false };
    case "aborted":
      return { message: "", fatal: false };
    default:
      return { message: "음성 인식에 문제가 생겼어요. 잠시 후 다시 눌러주세요.", fatal: true };
  }
}
