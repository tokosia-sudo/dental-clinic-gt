-- ============================================================
-- Dental Clinic GT — Booking database schema (Supabase / Postgres)
-- Run this in your Supabase project: SQL Editor → New query → paste → Run.
-- Phase 2 of the booking system. Safe to run on a fresh project.
-- ============================================================

-- ---------- Tables ----------
create table if not exists services (
  id          text primary key,            -- 'general', 'implants', ...
  name_ka     text not null,
  name_en     text not null,
  duration_min int  not null default 30,
  sort        int  not null default 0,
  active      boolean not null default true
);

create table if not exists doctors (
  id        uuid primary key default gen_random_uuid(),
  slug      text unique not null,           -- 'nino', 'giorgi', ...
  name      text not null,
  role_ka   text,
  role_en   text,
  active    boolean not null default true,
  sort      int not null default 0
);

-- which services each doctor provides
create table if not exists doctor_services (
  doctor_id  uuid references doctors(id) on delete cascade,
  service_id text references services(id) on delete cascade,
  primary key (doctor_id, service_id)
);

-- weekly working hours per doctor (weekday: 0=Sun .. 6=Sat)
create table if not exists working_hours (
  id         bigint generated always as identity primary key,
  doctor_id  uuid references doctors(id) on delete cascade,
  weekday    int not null check (weekday between 0 and 6),
  start_min  int not null,                  -- minutes from midnight, e.g. 600 = 10:00
  end_min    int not null
);

-- booked appointments (one row = one occupied slot)
create table if not exists appointments (
  id            bigint generated always as identity primary key,
  doctor_id     uuid not null references doctors(id) on delete cascade,
  service_id    text not null references services(id),
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  patient_name  text not null,
  patient_phone text not null,
  patient_email text,
  note          text,
  status        text not null default 'booked',  -- booked | done | cancelled
  created_at    timestamptz not null default now(),
  unique (doctor_id, starts_at)            -- <-- prevents double-booking
);

-- ---------- Public availability view (NO patient PII) ----------
-- The website reads this; it only exposes which doctor is busy, when, with what service.
create or replace view busy_slots as
  select doctor_id, service_id, starts_at, ends_at
  from appointments
  where status = 'booked';

-- ---------- Booking function (validates + inserts atomically) ----------
create or replace function book_appointment(
  p_doctor   uuid,
  p_service  text,
  p_starts   timestamptz,
  p_name     text,
  p_phone    text,
  p_email    text default null,
  p_note     text default null
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dur int;
  v_id  bigint;
begin
  if length(trim(p_name)) < 2 then raise exception 'invalid name'; end if;
  if p_phone !~ '^\+?[0-9\s\-()]{6,20}$' then raise exception 'invalid phone'; end if;
  if p_starts < now() then raise exception 'slot in the past'; end if;

  select duration_min into v_dur from services where id = p_service and active;
  if v_dur is null then raise exception 'unknown service'; end if;

  insert into appointments (doctor_id, service_id, starts_at, ends_at, patient_name, patient_phone, patient_email, note)
  values (p_doctor, p_service, p_starts, p_starts + (v_dur || ' minutes')::interval,
          trim(p_name), trim(p_phone), nullif(trim(coalesce(p_email,'')),''), p_note)
  returning id into v_id;

  return v_id;       -- unique(doctor_id, starts_at) makes a taken slot fail automatically
end;
$$;

-- ---------- Row Level Security ----------
alter table services        enable row level security;
alter table doctors         enable row level security;
alter table doctor_services enable row level security;
alter table working_hours   enable row level security;
alter table appointments    enable row level security;

-- Public can read the catalog + schedule (needed to compute availability)
create policy "public read services"   on services        for select using (true);
create policy "public read doctors"    on doctors         for select using (active);
create policy "public read doc_svc"    on doctor_services for select using (true);
create policy "public read hours"      on working_hours   for select using (true);

-- Public can NOT read the appointments table directly (PII). They use busy_slots view
-- and the book_appointment() function. Only authenticated staff can read/manage.
create policy "staff read appts"   on appointments for select using (auth.role() = 'authenticated');
create policy "staff write appts"  on appointments for all    using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant execute on function book_appointment to anon, authenticated;
grant select on busy_slots to anon, authenticated;

-- ---------- Seed data (matches the website's placeholders) ----------
insert into services (id, name_ka, name_en, duration_min, sort) values
  ('general',   'ზოგადი სტომატოლოგია',     'General dentistry',     30, 1),
  ('implants',  'იმპლანტაცია',             'Dental implants',       60, 2),
  ('ortho',     'ორთოდონტია',              'Orthodontics',          45, 3),
  ('cosmetic',  'ესთეტიკა და გათეთრება',   'Cosmetic & whitening',  45, 4),
  ('pediatric', 'ბავშვთა სტომატოლოგია',    'Pediatric dentistry',   30, 5),
  ('surgery',   'ქირურგია და პროთეზირება', 'Surgery & prosthetics', 60, 6)
on conflict (id) do nothing;
