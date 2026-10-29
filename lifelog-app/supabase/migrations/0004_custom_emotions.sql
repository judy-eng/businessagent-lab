-- 사용자가 직접 추가하는 감정 (기획안 v4, 3-4 감정)
-- 기본 70개는 id 1~70이고, 직접 추가하는 감정은 71번부터 자동으로 번호를 받는다.
alter table emotion_types add column is_custom boolean not null default false;

create sequence emotion_types_id_seq start 71;
alter table emotion_types alter column id set default nextval('emotion_types_id_seq');
alter sequence emotion_types_id_seq owned by emotion_types.id;
