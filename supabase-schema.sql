begin;

create extension if not exists pgcrypto;

-- Upgrade the earlier one-word names without losing existing data.
do $$
begin
  if to_regclass('public."sheylaspro-sitecontent"') is not null
     and to_regclass('public."sheylaspro-site_content"') is null then
    alter table public."sheylaspro-sitecontent"
      rename to "sheylaspro-site_content";
  end if;

  if to_regclass('public."sheylaspro-staffprofiles"') is not null
     and to_regclass('public."sheylaspro-staff_profiles"') is null then
    alter table public."sheylaspro-staffprofiles"
      rename to "sheylaspro-staff_profiles";
  end if;
end
$$;

create table if not exists public."sheylaspro-appointments" (
  id uuid primary key default gen_random_uuid(), client_name text not null,
  phone text not null, service text not null, team_member text,
  appointment_date date not null, appointment_time time not null,
  duration_minutes integer not null default 120,
  status text not null default 'pending' check (status in ('pending','confirmed','completed','cancelled')),
  notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public."sheylaspro-clients" (
  id uuid primary key default gen_random_uuid(), name text not null, phone text,
  email text, address text, last_service date, total_visits integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public."sheylaspro-reviews" (
  id uuid primary key default gen_random_uuid(), author text not null, body text not null,
  rating integer not null check (rating between 1 and 5), source text not null default 'Website',
  published boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public."sheylaspro-services" (
  id uuid primary key default gen_random_uuid(), name text not null, description text,
  price_label text not null default 'Custom estimate', icon text not null default '✦',
  image_url text, sort_order integer not null default 0, is_live boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public."sheylaspro-estimates" (
  id uuid primary key default gen_random_uuid(), client_name text not null, phone text not null,
  service text not null, details text not null, request_type text not null default 'estimate',
  amount numeric(10,2), status text not null default 'new' check (status in ('new','sent','accepted','declined','closed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public."sheylaspro-team" (
  id uuid primary key default gen_random_uuid(), name text not null, role text,
  availability text, active boolean not null default true, sort_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public."sheylaspro-site_content" (
  key text primary key, value text not null default '', updated_at timestamptz not null default now()
);
create table if not exists public."sheylaspro-staff_profiles" (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null, role text not null default 'staff', active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

alter table public."sheylaspro-appointments" enable row level security;
alter table public."sheylaspro-clients" enable row level security;
alter table public."sheylaspro-reviews" enable row level security;
alter table public."sheylaspro-services" enable row level security;
alter table public."sheylaspro-estimates" enable row level security;
alter table public."sheylaspro-team" enable row level security;
alter table public."sheylaspro-site_content" enable row level security;
alter table public."sheylaspro-staff_profiles" enable row level security;

do $$ declare t text; begin
  foreach t in array array['sheylaspro-appointments','sheylaspro-clients','sheylaspro-reviews','sheylaspro-services','sheylaspro-estimates','sheylaspro-team','sheylaspro-site_content','sheylaspro-staff_profiles'] loop
    execute format('drop policy if exists "sheylaspro authenticated manage" on public.%I',t);
    execute format('create policy "sheylaspro authenticated manage" on public.%I for all to authenticated using (true) with check (true)',t);
  end loop;
end $$;

drop policy if exists "sheylaspro public services" on public."sheylaspro-services";
create policy "sheylaspro public services" on public."sheylaspro-services" for select to anon using (is_live = true);
drop policy if exists "sheylaspro public reviews" on public."sheylaspro-reviews";
create policy "sheylaspro public reviews" on public."sheylaspro-reviews" for select to anon using (published = true);
drop policy if exists "sheylaspro public content" on public."sheylaspro-site_content";
create policy "sheylaspro public content" on public."sheylaspro-site_content" for select to anon using (true);
drop policy if exists "sheylaspro public estimates" on public."sheylaspro-estimates";
create policy "sheylaspro public estimates" on public."sheylaspro-estimates" for insert to anon with check (status = 'new' and amount is null);

insert into public."sheylaspro-site_content" (key,value) values
 ('business','Sheyla’s Pro Cleaning'),('phone','(702) 859-9565'),
 ('email','sheylacleaning91@gmail.com'),('address','Las Vegas, NV'),
 ('open','07:00'),('close','18:00'),('area','Las Vegas, Summerlin, Henderson, North Las Vegas'),
 ('other','') on conflict (key) do nothing;

commit;
