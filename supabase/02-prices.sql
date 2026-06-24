-- ============================================================
-- Dental Clinic GT — add price ranges to services (run once)
-- Lets the booking page show an indicative price per service.
-- These are placeholder ranges (Tbilisi market) — edit later in admin.
-- Run in Supabase: SQL Editor → New query → paste → Run.
-- ============================================================

alter table services add column if not exists price_from int;
alter table services add column if not exists price_to   int;

update services set price_from = v.pf, price_to = v.pt
from (values
  ('general',     50,  450),
  ('implants',  1500, 3000),
  ('ortho',     2000, 7000),
  ('cosmetic',   300, 1200),
  ('pediatric',   50,  150),
  ('surgery',     60, 1500)
) as v(id, pf, pt)
where services.id = v.id;
