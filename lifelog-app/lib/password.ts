import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// 비밀번호 규칙 (기획안 비밀번호 입력 화면): 최소 8자, 대문자 영어 + 소문자 영어 + 숫자
export const PASSWORD_RULE_TEXT = "최소 8자 · 영문 대문자, 소문자, 숫자를 모두 포함";

export function passwordRuleError(password: string): string | null {
  if (password.length < 8) return "비밀번호는 8자 이상이어야 합니다.";
  if (!/[A-Z]/.test(password)) return "영문 대문자를 포함해야 합니다.";
  if (!/[a-z]/.test(password)) return "영문 소문자를 포함해야 합니다.";
  if (!/[0-9]/.test(password)) return "숫자를 포함해야 합니다.";
  return null;
}

function derive(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, saltHex, keyHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = await derive(password, Buffer.from(saltHex, "hex"));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
