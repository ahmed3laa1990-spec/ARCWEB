-- Optional files (plans, photos) sent with a quote request.
-- Private bucket: visitors may upload into a fresh <uuid>/ folder and do
-- nothing else; staff read and delete them; notify-lead signs email links.

alter table public.leads
  add column if not exists attachments text[]
  check (attachments is null or (cardinality(attachments) <= 5
         and array_to_string(attachments, '') !~ '\.\.'));

-- Storage keys must be ASCII, so an Arabic file name is kept here,
-- index-aligned with attachments, for the email and the panel.
alter table public.leads
  add column if not exists attachment_names text[]
  check (attachment_names is null or (cardinality(attachment_names) <= 5
         and char_length(array_to_string(attachment_names, '')) <= 1000));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lead-files', 'lead-files', false, 15728640, array[
  'image/jpeg','image/png','image/webp','image/heic','image/heif',
  'application/pdf',
  'image/vnd.dwg','application/acad','application/x-dwg','image/x-dwg',
  'application/zip','application/x-zip-compressed'
])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "anon uploads lead files" on storage.objects;
create policy "anon uploads lead files"
  on storage.objects for insert to anon
  with check (
    bucket_id = 'lead-files'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and array_length(storage.foldername(name), 1) = 1
  );

drop policy if exists "staff read lead files" on storage.objects;
create policy "staff read lead files"
  on storage.objects for select to authenticated
  using (bucket_id = 'lead-files');

drop policy if exists "staff delete lead files" on storage.objects;
create policy "staff delete lead files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'lead-files');

drop policy if exists "anon submits a lead" on public.leads;
create policy "anon submits a lead"
  on public.leads for insert to anon
  with check (
    status = 'new'
    and source = 'website'
    and notes is null
    and (attachments is null or cardinality(attachments) <= 5)
  );
