-- ============================================================
-- Dental Clinic GT — make the ADMIN panel live & secure (run once)
-- Adds a "channel" to bookings and lets a signed-in staff member
-- (Supabase Auth) read and manage everything. The public still can
-- only read availability and book — never read patient details.
-- Run in Supabase: SQL Editor → New query → paste → Run.
-- ============================================================

-- 1) Track how a booking arrived (online / phone / messenger / walk-in)
alter table appointments add column if not exists channel text not null default 'online';

-- 2) Let a signed-in staff member see ALL doctors (including inactive ones)
drop policy if exists "staff read all doctors" on doctors;
create policy "staff read all doctors" on doctors
  for select using (auth.role() = 'authenticated');

-- 3) Let a signed-in staff member manage the catalog
drop policy if exists "staff write services" on services;
create policy "staff write services" on services
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "staff write doctors" on doctors;
create policy "staff write doctors" on doctors
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "staff write doc_svc" on doctor_services;
create policy "staff write doc_svc" on doctor_services
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "staff write hours" on working_hours;
create policy "staff write hours" on working_hours
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- (Managing appointments by staff is already allowed by the "staff write appts"
--  policy created in the first setup script.)
