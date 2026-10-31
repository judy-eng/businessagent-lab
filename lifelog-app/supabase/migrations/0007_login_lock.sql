-- 비밀번호 틀린 횟수를 세고, 5번 틀리면 15분간 로그인을 막는다.
alter table app_user
  add column if not exists failed_attempts integer not null default 0,
  add column if not exists locked_until timestamptz;
