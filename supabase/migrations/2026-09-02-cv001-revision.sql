-- CV-001 · 2026-09-01 스키마 → 2026-09-02 계약 개정 마이그레이션
--
-- 2026-09-01 schema.sql 을 이미 적용한 Supabase 프로젝트에서 실행한다.
-- 새 프로젝트라면 이 파일 대신 supabase/schema.sql 을 그대로 실행한다.
--
-- 되돌리기: 이 파일 맨 아래 주석의 rollback 블록을 실행한다.
--           단, 삭제한 열(session_id, consent_followup)의 값은 복구되지 않는다.
--           운영 데이터가 있는 상태에서 되돌릴 일이 있으면 먼저 백업한다.

begin;

-- 1. 동의 전 집계 테이블 신설 -------------------------------------------------
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

alter table landing_aggregate enable row level security;

create or replace function bump_landing_counter(
  p_event_date date, p_utm_source text, p_utm_medium text,
  p_utm_campaign text, p_utm_content text, p_landing_version text,
  p_locale text, p_device_class text, p_column text
) returns void
language plpgsql
as $$
begin
  if p_column not in ('landing_viewed_count', 'cta_clicked_count') then
    raise exception 'unsupported counter column: %', p_column;
  end if;
  insert into landing_aggregate as a (
    event_date, utm_source, utm_medium, utm_campaign, utm_content,
    landing_version, locale, device_class, landing_viewed_count, cta_clicked_count
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

-- 2. survey_response ---------------------------------------------------------
-- 개인별 세션키 제거 (Q-053)
alter table survey_response drop column if exists session_id;

-- 자격심사 열 → 사후 분류 열 (Q-058)
alter table survey_response rename column elig_status to travel_experience_old;
alter table survey_response add column if not exists travel_experience text[];
update survey_response
   set travel_experience = case
         when travel_experience_old is null then null
         when travel_experience_old = 'recent'   then array['within_1y']
         when travel_experience_old = 'planning' then array['preparing']
         when travel_experience_old = 'both'     then array['preparing','within_1y']
         when travel_experience_old = 'none'     then array['none']
         else array[travel_experience_old]
       end;
alter table survey_response drop column travel_experience_old;

alter table survey_response rename column elig_scope to planning_scope;
alter table survey_response rename column elig_region to travel_region;

-- 부적격 종료 제거 (Q-058, Q-059)
alter table survey_response drop column if exists ineligible_reason;
alter table survey_response drop column if exists inc_type_other;

update survey_response set status = 'partial' where status = 'ineligible';
alter table survey_response drop constraint if exists survey_response_status_check;
alter table survey_response add constraint survey_response_status_check
  check (status in ('consented','partial','problem_completed'));

-- 부분응답 파기 기준일
alter table survey_response add column if not exists updated_at timestamptz not null default now();

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

drop index if exists survey_response_session_idx;
drop index if exists survey_response_created_idx;
create index if not exists survey_response_updated_idx on survey_response (updated_at);
create index if not exists survey_response_completed_idx on survey_response (problem_completed_at);

alter table survey_response alter column landing_version set default 'v2';

-- 3. contact — 후속조사 동의 제거 (Q-052) ------------------------------------
alter table contact drop column if exists consent_followup;

-- 4. fulfillment — 추첨·제공·종료 상태 (Q-054, Q-055) ------------------------
alter table fulfillment add column if not exists lottery_completed_at  timestamptz;
alter table fulfillment add column if not exists selected              boolean;
alter table fulfillment add column if not exists selected_at           timestamptz;
alter table fulfillment add column if not exists sample_delivered_at   timestamptz;
alter table fulfillment add column if not exists fulfillment_closed_at timestamptz;
alter table fulfillment add column if not exists closed_reason_category text;
alter table fulfillment drop column if exists sample_used;
alter table fulfillment drop column if exists followup_at;
alter table fulfillment drop column if exists delivered_at;
alter table fulfillment drop column if exists not_delivered_reason;

alter table fulfillment drop constraint if exists fulfillment_review_status_check;
update fulfillment set review_status = 'pending'
 where review_status not in ('pending','not_selected','selected','delivered','closed');
alter table fulfillment add constraint fulfillment_review_status_check
  check (review_status in ('pending','not_selected','selected','delivered','closed'));

-- 5. event_log — 동의 후 이벤트만 남긴다 -------------------------------------
delete from event_log where response_id is null;
delete from event_log where event in
  ('landing_viewed','cta_clicked','partial_saved','ineligible_completed',
   'followup_completed','sample_used');
alter table event_log drop column if exists session_id;
alter table event_log alter column response_id set not null;
drop index if exists event_log_session_idx;

-- 6. 파기 실행 기록 ----------------------------------------------------------
create table if not exists purge_log (
  id           bigint generated always as identity primary key,
  ran_at       timestamptz not null default now(),
  category     text not null,
  deleted      bigint not null default 0,
  failed       bigint not null default 0,
  error_detail text
);
alter table purge_log enable row level security;

-- 7. 일괄 12개월 파기 → 차등 파기 --------------------------------------------
drop function if exists purge_expired(interval);
-- 새 purge_expired() 정의는 supabase/schema.sql 하단과 동일하다.
-- 이 마이그레이션 실행 후 schema.sql 의 purge_expired() 블록을 그대로 실행한다.

commit;

-- ---------------------------------------------------------------------------
-- rollback (필요할 때만 수동 실행)
--
-- begin;
--   alter table survey_response add column session_id text;
--   alter table survey_response rename column planning_scope to elig_scope;
--   alter table survey_response rename column travel_region to elig_region;
--   alter table survey_response add column elig_status text;
--   alter table survey_response drop column travel_experience;
--   alter table survey_response add column ineligible_reason text;
--   alter table contact add column consent_followup boolean not null default false;
--   alter table event_log add column session_id text;
--   alter table event_log alter column response_id drop not null;
--   drop table if exists landing_aggregate;
--   drop table if exists purge_log;
--   drop function if exists bump_landing_counter;
-- commit;
