-- 여행 정보 글 CRUD (미션 6)
-- 기존 설문 스키마가 적용된 프로젝트에서 SQL Editor로 실행한다.
-- 설문 테이블과 데이터를 변경하지 않는다.

create table if not exists travel_post (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(btrim(title)) between 1 and 80),
  region      text not null check (region in (
                'tokyo','osaka','kyoto','fukuoka','sapporo','okinawa','nagoya','other'
              )),
  body        text not null check (char_length(btrim(body)) between 1 and 2000),
  image_path  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists travel_post_created_idx on travel_post (created_at desc);
create index if not exists travel_post_region_idx on travel_post (region);

drop trigger if exists travel_post_touch on travel_post;
create trigger travel_post_touch
  before update on travel_post
  for each row execute function touch_updated_at();

alter table travel_post enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'travel-post-images',
  'travel-post-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
