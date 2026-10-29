-- 직접 추가한 감정을 삭제할 때: 이미 기록에 쓰인 감정은 지우지 않고 버블 판에서만 숨긴다.
-- (지난 기록에는 감정 이름이 그대로 남는다)
alter table emotion_types add column hidden boolean not null default false;
