-- Sheyla's Pro Cleaning: secure client calendar links
-- Run this in Supabase project wfxuxrvygyzonkflpwoq.
-- It creates a private random token per appointment and a limited public lookup RPC.

create extension if not exists pgcrypto;

alter table public."sheylaspro-appointments"
  add column if not exists calendar_token uuid default gen_random_uuid();

update public."sheylaspro-appointments"
set calendar_token = gen_random_uuid()
where calendar_token is null;

alter table public."sheylaspro-appointments"
  alter column calendar_token set default gen_random_uuid();

create unique index if not exists sheylaspro_appointments_calendar_token_uidx
  on public."sheylaspro-appointments" (calendar_token);

create or replace function public.get_sheylaspro_calendar_appointment(p_token uuid)
returns table (
  appointment_id uuid,
  client_first_name text,
  service text,
  appointment_date date,
  appointment_time time,
  duration_minutes integer,
  status text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    a.id as appointment_id,
    split_part(trim(coalesce(c.name, a.client_name, a.guest_name, 'Client')), ' ', 1) as client_first_name,
    coalesce(s.name, a.service, 'Cleaning appointment') as service,
    a.appointment_date,
    a.appointment_time,
    coalesce(a.duration_minutes, 120) as duration_minutes,
    a.status
  from public."sheylaspro-appointments" a
  left join public."sheylaspro-clients" c on c.id = a.client_id
  left join public."sheylaspro-services" s on s.id = a.service_id
  where a.calendar_token = p_token
    and coalesce(a.status, 'pending') <> 'cancelled'
  limit 1;
$$;

revoke all on function public.get_sheylaspro_calendar_appointment(uuid) from public;
grant execute on function public.get_sheylaspro_calendar_appointment(uuid) to anon, authenticated;

comment on column public."sheylaspro-appointments".calendar_token is
  'Opaque token used for client calendar confirmation links.';

comment on function public.get_sheylaspro_calendar_appointment(uuid) is
  'Returns only calendar-safe appointment details for one opaque appointment token.';

-- Example confirmation link built by the admin:
-- https://merci-chi.github.io/sheylasprocleaning/calendar.html?token=<calendar_token>
