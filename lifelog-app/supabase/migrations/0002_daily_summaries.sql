-- AI 일 단위 한 줄 요약 결과 (기획안 v4, 8번에 추가)
create table daily_summaries (
  date date primary key,
  summary text not null,
  created_at timestamptz not null default now()
);

alter table daily_summaries enable row level security;
