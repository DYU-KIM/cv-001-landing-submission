-- CV-001 Landing And Survey — Postgres schema (2026-09-02 revision)
--
-- Contract: project-docs/projects/local-travel-info-marketplace/01-research/cv-001/LANDING-FORM-CONTRACT-KO.md
-- Decisions: 02-product/QUESTIONS.md Q-052 ~ Q-059
--
-- 이 파일은 새 프로젝트용 전체 스키마다.
-- 2026-09-01 스키마가 이미 적용된 프로젝트는 supabase/migrations/ 의 마이그레이션을 쓴다.
--
-- Data separation (contract "Data Separation"):
--   landing_aggregate = 동의 전 집계. 개인 연결키 없음.
--   survey_response   = 문제 응답. 연락처 원문 없음.
--   sample_request    = 샘플 조건. 연락처 없음.
--   contact           = 연락처. response_id 만 연결키.
--   fulfillment       = 운영자 전용 추첨·제공 기록.
--   event_log         = 동의 후 행동 이벤트. 설문 원문·이메일 저장 금지.
--   purge_log         = 자동파기 실행 기록. 건수만 남긴다.

create extension if not exists "pgcrypto";

-- ------------------------------------------------- 동의 전 집계 (개인 식별 없음)
-- 동의 전에는 anonymous_session_id, response_id, 식별 쿠키를 만들지 않는다. (Q-053)
create table if not exists landing_aggregate (
  event_date       date not null,
  utm_source       text not null default '',
  utm_medium       text not null default '',
  utm_campaign     text not null default '',
  utm_content      text not null default '',
  landing_version  text not null default 'v2',
  locale           text not null default 'ko',
  device_class     text not null default 'unknown',

  landing_viewed_count bigint not null default 0,
  cta_clicked_count    bigint not null default 0,

  primary key (event_date, utm_source, utm_medium, utm_campaign,
               utm_content, landing_version, locale, device_class)
);

-- 원자적 증가. 애플리케이션이 읽고-쓰지 않도록 서버 함수로 처리한다.
create or replace function bump_landing_counter(
  p_event_date date,
  p_utm_source text,
  p_utm_medium text,
  p_utm_campaign text,
  p_utm_content text,
  p_landing_version text,
  p_locale text,
  p_device_class text,
  p_column text
) returns void
language plpgsql
as $$
begin
  if p_column not in ('landing_viewed_count', 'cta_clicked_count') then
    raise exception 'unsupported counter column: %', p_column;
  end if;

  insert into landing_aggregate as a (
    event_date, utm_source, utm_medium, utm_campaign, utm_content,
    landing_version, locale, device_class,
    landing_viewed_count, cta_clicked_count
  ) values (
    p_event_date, p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content,
    p_landing_version, p_locale, p_device_class,
    case when p_column = 'landing_viewed_count' then 1 else 0 end,
    case when p_column = 'cta_clicked_count' then 1 else 0 end
  )
  on conflict (event_date, utm_source, utm_medium, utm_campaign,
               utm_content, landing_version, locale, device_class)
  do update set
    landing_viewed_count = a.landing_viewed_count
      + case when p_column = 'landing_viewed_count' then 1 else 0 end,
    cta_clicked_count = a.cta_clicked_count
      + case when p_column = 'cta_clicked_count' then 1 else 0 end;
end;
$$;

-- ------------------------------------------------------------- 문제 응답 저장소
create table if not exists survey_response (
  response_id           uuid primary key default gen_random_uuid(),

  -- 동의 후에만 저장하는 유입정보 (동의 전 집계와 사후 연결하지 않는다)
  utm_source            text,
  utm_medium            text,
  utm_campaign          text,
  utm_content           text,
  landing_version       text not null default 'v2',
  locale                text not null default 'ko',
  device_class          text,

  -- lifecycle
  status                text not null default 'consented'
                          check (status in ('consented','partial','problem_completed')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  consent_at            timestamptz,
  form_started_at       timestamptz,
  problem_completed_at  timestamptz,
  solution_viewed_at    timestamptz,
  sample_requested_at   timestamptz,
  contact_submitted_at  timestamptz,
  problem_locked        boolean not null default false,
  last_step             text,

  -- SF-01 여행 맥락 (자격심사가 아니라 사후 분류값)
  travel_experience     text[],      -- Q-CONTEXT-01
  planning_scope        text[],      -- Q-CONTEXT-02
  travel_region         text,        -- Q-CONTEXT-03 (선택 입력)

  -- SF-02 사건
  inc_type              text,
  inc_description       text,
  inc_timing            text,

  -- SF-03 정보원
  src_first             text,
  src_next              text[],
  src_move_reasons      text[],
  src_move_reason_other text,

  -- SF-04 영향과 무료 대안
  imp_outcomes          text[],
  imp_outcome_other     text,
  imp_extra_time        text,
  alt_sufficient_note   text
);

create index if not exists survey_response_status_idx on survey_response (status);
create index if not exists survey_response_updated_idx on survey_response (updated_at);
create index if not exists survey_response_completed_idx on survey_response (problem_completed_at);

create or replace function touch_updated_at() returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists survey_response_touch on survey_response;
create trigger survey_response_touch
  before update on survey_response
  for each row execute function touch_updated_at();

-- ------------------------------------------------------------- 샘플 조건
create table if not exists sample_request (
  request_id     uuid primary key default gen_random_uuid(),
  response_id    uuid not null unique references survey_response(response_id) on delete cascade,
  focus          text[] not null,
  focus_other    text,
  note           text,
  needed_by      date,          -- 예정 여행이 없는 신청자는 비워둘 수 있다
  created_at     timestamptz not null default now()
);

-- ------------------------------------------------------------- 연락처 저장소
-- 후속 사용조사를 하지 않으므로 후속 연락 동의 열은 없다. (Q-052)
create table if not exists contact (
  contact_id        uuid primary key default gen_random_uuid(),
  response_id       uuid not null unique references survey_response(response_id) on delete cascade,
  email             text not null,
  consent_sample    boolean not null default false,
  consented_at      timestamptz not null default now(),
  withdrawn_at      timestamptz
);

-- ------------------------------------------------------------- 운영자 전용
-- 추첨 인원·날짜·제공기한은 Founder 운영값이며 코드 상수로 고정하지 않는다. (Q-055)
create table if not exists fulfillment (
  response_id            uuid primary key references survey_response(response_id) on delete cascade,
  review_status          text not null default 'pending'
                           check (review_status in
                             ('pending','not_selected','selected','delivered','closed')),
  lottery_completed_at   timestamptz,
  selected               boolean,
  selected_at            timestamptz,
  sample_delivered_at    timestamptz,
  fulfillment_closed_at  timestamptz,
  closed_reason_category text,
  operator_note          text,
  updated_at             timestamptz not null default now()
);

-- ------------------------------------------------------------- 이벤트
-- 동의 후 행동만 기록한다. landing_viewed / cta_clicked 는 집계 테이블에 있다.
create table if not exists event_log (
  id           bigint generated always as identity primary key,
  response_id  uuid not null references survey_response(response_id) on delete cascade,
  event        text not null,
  step         text,
  occurred_at  timestamptz not null default now(),
  params       jsonb not null default '{}'::jsonb,
  dedupe_key   text not null unique
);

create index if not exists event_log_event_idx on event_log (event);
create index if not exists event_log_occurred_idx on event_log (occurred_at);

-- ------------------------------------------------------------- 파기 실행 기록
create table if not exists purge_log (
  id           bigint generated always as identity primary key,
  ran_at       timestamptz not null default now(),
  category     text not null,
  deleted      bigint not null default 0,
  failed       bigint not null default 0,
  error_detail text
);

-- ------------------------------------------------------------- 접근 제어
-- 서버(service role)만 접근한다. anon 키로는 어떤 행도 읽거나 쓸 수 없다.
alter table landing_aggregate enable row level security;
alter table survey_response   enable row level security;
alter table sample_request    enable row level security;
alter table contact           enable row level security;
alter table fulfillment       enable row level security;
alter table event_log         enable row level security;
alter table purge_log         enable row level security;

-- ------------------------------------------------------------- 차등 자동파기
-- 계약서 "Retention And Automatic Deletion". 최소 하루 한 번 실행한다.
--
--   중도 이탈 부분응답        updated_at + 30일
--   완료된 문제응답            problem_completed_at + 12개월
--   미선정자 이메일·샘플조건   lottery_completed_at + 30일
--   선정자 이메일·샘플조건     sample_delivered_at + 30일
--   제공 종료 건               fulfillment_closed_at + 30일
--
-- 이메일·샘플조건이 지워져도 완료 문제응답의 행동증거(시각·참거짓)는 12개월까지 남는다.
create or replace function purge_expired()
returns table (category text, deleted bigint)
language plpgsql
as $$
declare
  n bigint;
  m bigint;
begin
  -- 1. 중도 이탈 부분응답 (연결된 샘플조건·연락처는 cascade 로 함께 삭제)
  delete from survey_response
   where status <> 'problem_completed'
     and updated_at < now() - interval '30 days';
  get diagnostics n = row_count;
  insert into purge_log (category, deleted) values ('partial_response', n);
  category := 'partial_response'; deleted := n; return next;

  -- 2. 완료된 문제응답
  delete from survey_response
   where status = 'problem_completed'
     and problem_completed_at < now() - interval '12 months';
  get diagnostics n = row_count;
  insert into purge_log (category, deleted) values ('completed_response', n);
  category := 'completed_response'; deleted := n; return next;

  -- 3. 추첨 미선정자의 이메일·샘플 조건
  delete from contact c
   using fulfillment f
   where f.response_id = c.response_id
     and f.selected is distinct from true
     and f.lottery_completed_at is not null
     and f.lottery_completed_at < now() - interval '30 days';
  get diagnostics n = row_count;
  delete from sample_request s
   using fulfillment f
   where f.response_id = s.response_id
     and f.selected is distinct from true
     and f.lottery_completed_at is not null
     and f.lottery_completed_at < now() - interval '30 days';
  get diagnostics m = row_count;
  insert into purge_log (category, deleted) values ('not_selected_contact', n + m);
  category := 'not_selected_contact'; deleted := n + m; return next;

  -- 4. 선정자의 이메일·샘플 조건 (제공 완료 기준)
  delete from contact c
   using fulfillment f
   where f.response_id = c.response_id
     and f.sample_delivered_at is not null
     and f.sample_delivered_at < now() - interval '30 days';
  get diagnostics n = row_count;
  delete from sample_request s
   using fulfillment f
   where f.response_id = s.response_id
     and f.sample_delivered_at is not null
     and f.sample_delivered_at < now() - interval '30 days';
  get diagnostics m = row_count;
  insert into purge_log (category, deleted) values ('delivered_contact', n + m);
  category := 'delivered_contact'; deleted := n + m; return next;

  -- 5. 선정 후 제공이 종료된 건 (무기한 잔존 방지)
  delete from contact c
   using fulfillment f
   where f.response_id = c.response_id
     and f.fulfillment_closed_at is not null
     and f.fulfillment_closed_at < now() - interval '30 days';
  get diagnostics n = row_count;
  delete from sample_request s
   using fulfillment f
   where f.response_id = s.response_id
     and f.fulfillment_closed_at is not null
     and f.fulfillment_closed_at < now() - interval '30 days';
  get diagnostics m = row_count;
  insert into purge_log (category, deleted) values ('closed_contact', n + m);
  category := 'closed_contact'; deleted := n + m; return next;
end;
$$;
