-- Email the team when a lead arrives.
-- After every insert into public.leads, pg_net posts the row to the
-- notify-lead Edge Function, which sends the email through Resend.
--
-- The function URL and a random shared secret are stored in app_secrets
-- (staff-only). The function reads the same row with its service role, so
-- the only thing set by hand is RESEND_API_KEY on the function.
-- Safe to re-run.

create extension if not exists pg_net with schema extensions;

create or replace function public.notify_new_lead()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url    text;
  v_secret text;
begin
  select value into v_url    from public.app_secrets where key = 'lead_notify_url';
  select value into v_secret from public.app_secrets where key = 'lead_notify_secret';
  if v_url is null or v_secret is null then
    return new;
  end if;

  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret),
    body    := jsonb_build_object('record', to_jsonb(new))
  );
  return new;
exception when others then
  -- A notification problem must never lose the lead itself.
  raise warning 'notify_new_lead failed: %', sqlerrm;
  return new;
end;
$$;

revoke all on function public.notify_new_lead() from public, anon, authenticated;

drop trigger if exists leads_notify on public.leads;
create trigger leads_notify
  after insert on public.leads
  for each row execute function public.notify_new_lead();

insert into public.app_secrets (key, value) values
  ('lead_notify_url', 'https://cavojuqysdabhnidhhqa.supabase.co/functions/v1/notify-lead'),
  ('lead_notify_secret', encode(gen_random_bytes(32), 'hex'))
on conflict (key) do nothing;
