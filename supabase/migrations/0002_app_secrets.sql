-- Somewhere for the panel to keep the GitHub token, so the operator signs in
-- once with email and password instead of pasting a token into every browser.
-- Readable only by a signed-in staff account; the anon role gets nothing.

create table if not exists public.app_secrets (
  key        text primary key check (char_length(key) between 1 and 60),
  value      text not null,
  updated_at timestamptz not null default now()
);

comment on table public.app_secrets is 'Operational secrets for the admin panel. Staff-only: anon has no grant and no policy.';

alter table public.app_secrets enable row level security;

drop policy if exists "staff manage secrets" on public.app_secrets;
create policy "staff manage secrets"
  on public.app_secrets for all to authenticated
  using (true) with check (true);

revoke all on public.app_secrets from anon;
revoke all on public.app_secrets from public;
grant select, insert, update, delete on public.app_secrets to authenticated;

drop trigger if exists app_secrets_touch on public.app_secrets;
create trigger app_secrets_touch
  before update on public.app_secrets
  for each row execute function public.touch_updated_at();
