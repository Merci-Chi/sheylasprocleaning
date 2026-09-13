begin;

create table if not exists public."sheylaspro-requests" (
  id uuid primary key default gen_random_uuid(),
  request_type text not null,
  subject text not null,
  details text not null,
  status text not null default 'open'
    check (status in ('open', 'completed')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public."sheylaspro-requests" enable row level security;

drop policy if exists "sheylaspro authenticated manage"
  on public."sheylaspro-requests";

create policy "sheylaspro authenticated manage"
on public."sheylaspro-requests"
for all
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) ~
    '^[^@]+@(sheylaspro[.]com|steadyhandsop[.]com)$'
)
with check (
  lower(coalesce(auth.jwt() ->> 'email', '')) ~
    '^[^@]+@(sheylaspro[.]com|steadyhandsop[.]com)$'
);

grant select, insert, update, delete
on public."sheylaspro-requests"
to authenticated;

notify pgrst, 'reload schema';

commit;
