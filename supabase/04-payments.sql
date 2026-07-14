-- ============================================================
-- Dental Clinic GT — Payments & daily/monthly takings (Phase 4)
-- Run this in your Supabase project: SQL Editor → New query → paste → Run.
-- Safe to run more than once.
-- ============================================================

-- How a finished visit was paid. A small list, e.g.
--   [{"method":"tbc","amount":150},{"method":"cash","amount":50}]
-- Allowed methods: tbc | bog | cash | installment (max two per visit).
alter table appointments add column if not exists payments jsonb;

-- A finished ('done') visit still occupied its time — keep it shown as busy
-- to online visitors (before this, only 'booked' rows blocked the slot).
create or replace view busy_slots as
  select doctor_id, service_id, starts_at, ends_at
  from appointments
  where status in ('booked', 'done');
