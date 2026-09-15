begin;

alter table public."sheylaspro-estimates"
  add column if not exists room_count integer,
  add column if not exists photo_paths text[] not null default '{}',
  add column if not exists client_id uuid references public."sheylaspro-clients"(id) on delete set null,
  add column if not exists service_id uuid references public."sheylaspro-services"(id) on delete set null,
  add column if not exists guest_name text,
  add column if not exists guest_phone text,
  add column if not exists estimate_date date default current_date,
  add column if not exists notes text default '';

alter table public."sheylaspro-estimates"
  drop constraint if exists "sheylaspro-estimates_room_count_check";

alter table public."sheylaspro-estimates"
  add constraint "sheylaspro-estimates_room_count_check"
  check (room_count is null or room_count >= 1);

alter table public."sheylaspro-estimates" enable row level security;

drop policy if exists "sheylaspro public estimates" on public."sheylaspro-estimates";
create policy "sheylaspro public estimates"
on public."sheylaspro-estimates"
for insert
to anon, authenticated
with check (status = 'new' and amount is null);

grant insert on public."sheylaspro-estimates" to anon, authenticated;

insert into storage.buckets
  (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sheylaspro-estimate-photos',
  'sheylaspro-estimate-photos',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- The public site may be anonymous or may already have an authenticated
-- session in the browser. Allow either role to add a photo to this bucket.
drop policy if exists "sheylaspro upload estimate photos" on storage.objects;
drop policy if exists "sheylaspro public estimate photo uploads" on storage.objects;
create policy "sheylaspro public estimate photo uploads"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'sheylaspro-estimate-photos');

drop policy if exists "sheylaspro staff read estimate photos" on storage.objects;
drop policy if exists "sheylaspro staff view estimate photos" on storage.objects;
create policy "sheylaspro staff view estimate photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'sheylaspro-estimate-photos'
  and lower(coalesce(auth.jwt() ->> 'email', '')) ~
    '^[^@]+@(sheylaspro[.]com|steadyhandsop[.]com)$'
);

drop policy if exists "sheylaspro staff delete estimate photos" on storage.objects;
create policy "sheylaspro staff delete estimate photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'sheylaspro-estimate-photos'
  and lower(coalesce(auth.jwt() ->> 'email', '')) ~
    '^[^@]+@(sheylaspro[.]com|steadyhandsop[.]com)$'
);

commit;
