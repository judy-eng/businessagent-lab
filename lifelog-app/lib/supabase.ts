import "server-only";
import { createClient } from "@supabase/supabase-js";

// 서버에서만 사용한다. service role 키는 브라우저로 보내지 않는다.
export function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 가 .env.local 에 필요합니다.",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
