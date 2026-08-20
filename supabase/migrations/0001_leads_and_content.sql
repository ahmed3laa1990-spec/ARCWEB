-- ARC website — initial schema
-- Run once in the Supabase SQL Editor for project cavojuqysdabhnidhhqa.
-- Safe to re-run: every statement is guarded.

-- ============================================================
-- 1) leads — quote requests submitted from byarcsa.com
-- ============================================================
create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null check (char_length(btrim(name)) between 2 and 120),
  phone       text not null check (char_length(btrim(phone)) between 6 and 25),
  email       text check (email is null or email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$'),
  scope       text check (scope is null or char_length(scope) <= 80),
  city        text check (city is null or char_length(city) <= 80),
  area        integer check (area is null or (area >= 0 and area <= 1000000)),
  details     text check (details is null or char_length(details) <= 4000),
  lang        text check (lang is null or lang in ('ar', 'en')),
  source      text not null default 'website' check (char_length(source) <= 40),
  status      text not null default 'new' check (status in ('new', 'contacted', 'quoted', 'won', 'lost')),
  notes       text check (notes is null or char_length(notes) <= 4000)
);

comment on table public.leads is 'Quote requests from the public website. Visitors may insert; only signed-in staff may read.';

create index if not exists leads_created_idx on public.leads (created_at desc);
create index if not exists leads_status_idx  on public.leads (status);

alter table public.leads enable row level security;

-- A visitor may submit a request and nothing else. There is deliberately
-- no select policy for anon: the publishable key ships inside the site's
-- JavaScript, so anyone can read it, and customer phone numbers must not
-- be readable with it.
drop policy if exists "anon submits a lead" on public.leads;
create policy "anon submits a lead"
  on public.leads for insert to anon
  with check (
    status = 'new'
    and source = 'website'
    and notes is null
  );

drop policy if exists "staff read leads" on public.leads;
create policy "staff read leads"
  on public.leads for select to authenticated using (true);

drop policy if exists "staff update leads" on public.leads;
create policy "staff update leads"
  on public.leads for update to authenticated using (true) with check (true);

drop policy if exists "staff delete leads" on public.leads;
create policy "staff delete leads"
  on public.leads for delete to authenticated using (true);

revoke all on public.leads from anon;
grant insert on public.leads to anon;
grant select, insert, update, delete on public.leads to authenticated;

-- ============================================================
-- 2) site_content — editable content served to the website
-- ============================================================
create table if not exists public.site_content (
  key        text primary key check (char_length(key) between 1 and 80),
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text
);

comment on table public.site_content is 'Editable site content keyed by section. Public read, staff write.';

alter table public.site_content enable row level security;

drop policy if exists "anyone reads content" on public.site_content;
create policy "anyone reads content"
  on public.site_content for select to anon, authenticated using (true);

drop policy if exists "staff writes content" on public.site_content;
create policy "staff writes content"
  on public.site_content for all to authenticated using (true) with check (true);

revoke all on public.site_content from anon;
grant select on public.site_content to anon;
grant select, insert, update, delete on public.site_content to authenticated;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists site_content_touch on public.site_content;
create trigger site_content_touch
  before update on public.site_content
  for each row execute function public.touch_updated_at();
