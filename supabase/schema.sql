-- CV-001 Landing And Survey — Postgres schema
-- Contract: project-docs/projects/local-travel-info-marketplace/01-research/cv-001/LANDING-FORM-CONTRACT-KO.md
--
-- Data Separation (contract "Data Separation"):
--   survey_response  = 문제 응답 저장소. 연락처 원문 없음.
--   sample_request   = 샘플 조건. 연락처 없음.
--   contact          = 연락처 저장소. response_id 만 연결키.
--   fulfillment      = 운영자 전용 제공 기록.
--   event_log        = 행동 이벤트. 설문 원문·이메일 저장 금지.
--
-- Retention (D-PRIVACY-01, 2026-09-01 결정): 전 저장소 수집일로부터 12개월, 요청 시 즉시 삭제.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- problem store
create table if not exists survey_response (
  response_id           uuid primary key default gen_random_uuid(),
  session_id            text not null,

  -- LP-01 system-collected
  utm_source            text,
  utm_medium            text,
  utm_campaign          text,
  utm_content           text,
  landing_version       text not null default 'v1',
  locale                text not null default 'ko',
  device_class          text,

  -- lifecycle
  status                text not null default 'consented'
                          check (status in ('consented','ineligible','partial','problem_completed')),
  created_at            timestamptz not null default now(),
  consent_at            timestamptz,
  form_started_at       timestamptz,
  problem_completed_at  timestamptz,
  solution_viewed_at    timestamptz,
  sample_requested_at   timestamptz,
  contact_submitted_at  timestamptz,
  problem_locked        boolean not null default false,
  last_step             text,

  -- SF-01 eligibility
  elig_status           text,        -- Q-ELIG-01
  elig_scope            text[],      -- Q-ELIG-02
  elig_region           text,        -- Q-ELIG-03
  ineligible_reason     text,

  -- SF-02 incident
  inc_type              text,        -- Q-INC-01
  inc_type_other        text,
  inc_description       text,        -- Q-INC-02
  inc_timing            text,        -- Q-INC-03

  -- SF-03 sources
  src_first             text,        -- Q-SRC-01
  src_next              text[],      -- Q-SRC-02 (ordered)
  src_move_reasons      text[],      -- Q-SRC-03
  src_move_reason_other text,

  -- SF-04 impact and free alternatives
  imp_outcomes          text[],      -- Q-IMP-01
  imp_outcome_other     text,
  imp_extra_time        text,        -- Q-IMP-02
  alt_sufficient_note   text         -- Q-ALT-01
);

create index if not exists survey_response_session_idx on survey_response (session_id);
create index if not exists survey_response_status_idx on survey_response (status);
create index if not exists survey_response_created_idx on survey_response (created_at);

-- ---------------------------------------------------------------- sample conditions
create table if not exists sample_request (
  request_id     uuid primary key default gen_random_uuid(),
  response_id    uuid not null unique references survey_response(response_id) on delete cascade,
  focus          text[] not null,   -- Q-SMP-01 (max 2)
  focus_other    text,
  note           text,              -- Q-SMP-02
  needed_by      date not null,     -- Q-SMP-03
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------- contact store
create table if not exists contact (
  contact_id        uuid primary key default gen_random_uuid(),
  response_id       uuid not null unique references survey_response(response_id) on delete cascade,
  email             text not null,                 -- Q-CONTACT-01
  consent_sample    boolean not null default false, -- Q-CONTACT-02 (required)
  consent_followup  boolean not null default false, -- Q-FOLLOWUP-01 (optional)
  consented_at      timestamptz not null default now(),
  withdrawn_at      timestamptz
);

-- ---------------------------------------------------------------- operator-only
create table if not exists fulfillment (
  response_id          uuid primary key references survey_response(response_id) on delete cascade,
  review_status        text not null default 'pending'
                         check (review_status in ('pending','selected','not_selected','delivered')),
  not_delivered_reason text,
  delivered_at         timestamptz,
  followup_at          timestamptz,
  sample_used          text,
  operator_note        text,
  updated_at           timestamptz not null default now()
);

-- ---------------------------------------------------------------- events
create table if not exists event_log (
  id           bigint generated always as identity primary key,
  session_id   text not null,
  response_id  uuid references survey_response(response_id) on delete cascade,
  event        text not null,
  step         text,
  occurred_at  timestamptz not null default now(),
  params       jsonb not null default '{}'::jsonb,
  -- 한 행동에 중복 발화 금지 (contract "Event Contract")
  dedupe_key   text not null unique
);

create index if not exists event_log_event_idx on event_log (event);
create index if not exists event_log_session_idx on event_log (session_id);
create index if not exists event_log_occurred_idx on event_log (occurred_at);

-- ---------------------------------------------------------------- access
-- 서버(service role)만 접근한다. anon/authenticated 키로는 어떤 행도 읽거나 쓸 수 없다.
alter table survey_response enable row level security;
alter table sample_request  enable row level security;
alter table contact         enable row level security;
alter table fulfillment     enable row level security;
alter table event_log       enable row level security;

-- ---------------------------------------------------------------- retention
-- 12개월 경과분 파기. 운영자가 수동 또는 스케줄러로 실행한다.
create or replace function purge_expired(retention interval default interval '12 months')
returns table (deleted_responses bigint, deleted_events bigint)
language plpgsql
as $$
declare
  r bigint;
  e bigint;
begin
  delete from survey_response where created_at < now() - retention;
  get diagnostics r = row_count;
  delete from event_log where occurred_at < now() - retention;
  get diagnostics e = row_count;
  return query select r, e;
end;
$$;
