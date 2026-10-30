-- 하루에 한 번 보내는 알림의 기록 (기획안 v4, 5번 알림과 질문)
-- kind = 'todo_carryover': 오후 11:30 "미완료 todo 가 남아있습니다. 다음 날에 하시겠습니까?"
-- sent_at: 알림을 보낸 시각 (같은 날 중복 발송을 막는다)
-- answer: 사용자가 고른 답 ('yes' = 다음 날로 옮김, 'no' = 그대로 둠)
create table reminder_log (
  date date not null,
  kind text not null check (kind in ('todo_carryover')),
  sent_at timestamptz,
  answer text check (answer in ('yes', 'no')),
  answered_at timestamptz,
  primary key (date, kind)
);

alter table reminder_log enable row level security;
