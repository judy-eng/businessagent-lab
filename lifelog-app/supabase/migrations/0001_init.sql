-- 라이프로그 앱 초기 데이터 구조 (기획안 v4, 8번)
-- 혼자 쓰는 앱이며, 서버에서만 service role 키로 접근한다.
-- 모든 표에 RLS를 켜고 정책을 만들지 않아서, 브라우저의 anon 키로는 읽고 쓸 수 없다.

-- 사용자 (1명): 비밀번호 해시와 시간대
create table app_user (
  id smallint primary key default 1 check (id = 1),
  password_hash text not null,
  timezone text not null default 'Asia/Seoul',
  created_at timestamptz not null default now()
);

-- Todo: 날짜별, 순서만 가진다
create table todos (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  title text not null,
  done boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index todos_date_idx on todos (date, sort_order);

-- 루틴 카테고리 (사용자가 직접 설정)
create table routine_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- 루틴 정의: 반복 요일은 0(일)~6(토)
create table routines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid references routine_categories (id) on delete set null,
  repeat_days smallint[] not null default '{0,1,2,3,4,5,6}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (repeat_days <@ array[0,1,2,3,4,5,6]::smallint[])
);

-- 루틴 수행 기록: 날짜별 체크
create table routine_logs (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references routines (id) on delete cascade,
  date date not null,
  done boolean not null default false,
  unique (routine_id, date)
);
create index routine_logs_date_idx on routine_logs (date);

-- 일정: 시간 필드가 있는 체크리스트
create table schedules (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  time time,
  title text not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index schedules_date_idx on schedules (date, time);

-- 감정 종류 70개
create table emotion_types (
  id smallint primary key,
  name text not null unique,
  grp text not null check (grp in ('positive', 'neutral', 'negative')),
  sort_order smallint not null
);

-- 감정 기록: 하루에 여러 번, 같은 시간대에도 여러 번 가능
-- date와 time_slot은 앱이 사용자 시간대 기준으로 계산해서 저장한다
create table emotion_entries (
  id uuid primary key default gen_random_uuid(),
  recorded_at timestamptz not null default now(),
  date date not null,
  time_slot text not null check (time_slot in ('morning', 'afternoon', 'evening', 'late_night')),
  score smallint not null check (score between 0 and 10)
);
create index emotion_entries_date_idx on emotion_entries (date);

-- 감정 기록에서 고른 감정 종류 (복수 선택)
create table emotion_entry_types (
  entry_id uuid not null references emotion_entries (id) on delete cascade,
  type_id smallint not null references emotion_types (id),
  primary key (entry_id, type_id)
);

-- 일기
create table diary_entries (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  content text not null default '',
  updated_at timestamptz not null default now()
);

-- 날짜별 한 줄 메모
create table day_memos (
  date date primary key,
  memo text not null default ''
);

-- AI 주간 요약 결과
create table weekly_summaries (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  summary text not null,
  created_at timestamptz not null default now()
);

-- 브라우저 알림 구독 정보
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- RLS: 정책 없이 켜서 anon 키 접근을 막는다
alter table app_user enable row level security;
alter table todos enable row level security;
alter table routine_categories enable row level security;
alter table routines enable row level security;
alter table routine_logs enable row level security;
alter table schedules enable row level security;
alter table emotion_types enable row level security;
alter table emotion_entries enable row level security;
alter table emotion_entry_types enable row level security;
alter table diary_entries enable row level security;
alter table day_memos enable row level security;
alter table weekly_summaries enable row level security;
alter table push_subscriptions enable row level security;

-- 감정 종류 70개: 긍정 26, 중립·복합 14, 부정 30
insert into emotion_types (id, name, grp, sort_order) values
  (1, '행복', 'positive', 1),
  (2, '기쁨', 'positive', 2),
  (3, '설렘', 'positive', 3),
  (4, '만족', 'positive', 4),
  (5, '뿌듯함', 'positive', 5),
  (6, '감사', 'positive', 6),
  (7, '평온', 'positive', 7),
  (8, '안도', 'positive', 8),
  (9, '편안함', 'positive', 9),
  (10, '신남', 'positive', 10),
  (11, '자신감', 'positive', 11),
  (12, '희망', 'positive', 12),
  (13, '재미', 'positive', 13),
  (14, '따뜻함', 'positive', 14),
  (15, '후련함', 'positive', 15),
  (16, '기대', 'positive', 16),
  (17, '보람', 'positive', 17),
  (18, '여유', 'positive', 18),
  (19, '즐거움', 'positive', 19),
  (20, '상쾌함', 'positive', 20),
  (21, '짜릿함', 'positive', 21),
  (22, '든든함', 'positive', 22),
  (23, '벅참', 'positive', 23),
  (24, '홀가분함', 'positive', 24),
  (25, '자랑스러움', 'positive', 25),
  (26, '반가움', 'positive', 26),
  (27, '평범', 'neutral', 27),
  (28, '무덤덤', 'neutral', 28),
  (29, '멍함', 'neutral', 29),
  (30, '심심함', 'neutral', 30),
  (31, '그리움', 'neutral', 31),
  (32, '아쉬움', 'neutral', 32),
  (33, '복잡함', 'neutral', 33),
  (34, '긴장', 'neutral', 34),
  (35, '놀람', 'neutral', 35),
  (36, '어색함', 'neutral', 36),
  (37, '얼떨떨함', 'neutral', 37),
  (38, '궁금함', 'neutral', 38),
  (39, '낯섦', 'neutral', 39),
  (40, '산만함', 'neutral', 40),
  (41, '피곤', 'negative', 41),
  (42, '무기력', 'negative', 42),
  (43, '스트레스', 'negative', 43),
  (44, '불안', 'negative', 44),
  (45, '우울', 'negative', 45),
  (46, '외로움', 'negative', 46),
  (47, '슬픔', 'negative', 47),
  (48, '화남', 'negative', 48),
  (49, '짜증', 'negative', 49),
  (50, '답답함', 'negative', 50),
  (51, '지침', 'negative', 51),
  (52, '걱정', 'negative', 52),
  (53, '부담', 'negative', 53),
  (54, '두려움', 'negative', 54),
  (55, '서운함', 'negative', 55),
  (56, '실망', 'negative', 56),
  (57, '허무', 'negative', 57),
  (58, '초조', 'negative', 58),
  (59, '부끄러움', 'negative', 59),
  (60, '후회', 'negative', 60),
  (61, '억울', 'negative', 61),
  (62, '질투', 'negative', 62),
  (63, '막막함', 'negative', 63),
  (64, '초라함', 'negative', 64),
  (65, '자책', 'negative', 65),
  (66, '원망', 'negative', 66),
  (67, '괴로움', 'negative', 67),
  (68, '서러움', 'negative', 68),
  (69, '조급함', 'negative', 69),
  (70, '혼란', 'negative', 70);
