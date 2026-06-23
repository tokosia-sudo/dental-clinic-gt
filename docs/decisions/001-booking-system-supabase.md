# 001: Online booking — Supabase backend

## Date
2026-06-23

## Status
accepted (implementation in progress)

## Context
The clinic wants a Fresha-style online booking system: visitors see each doctor's
live availability (free/busy slots, with the procedure shown on busy ones), pick a free
slot, and book. A booked slot must instantly become unavailable to everyone, and the
clinic needs a way to manage doctors, working hours, services and appointments.

The current site is a static, no-build HTML/CSS/JS site hosted (or hostable) for free.
A real, live, multi-user booking system needs persistent shared storage and an API.

## Decision
Use **Supabase** (hosted Postgres + auto-generated API + Auth + Row Level Security) as
the backend. The static frontend talks to Supabase via its JS client.

- Public visitors can read **availability only** (a view that excludes patient PII) and
  create a booking through a `book_appointment` Postgres function (SECURITY DEFINER) that
  validates the slot and inserts atomically. A unique constraint on
  `(doctor_id, starts_at)` prevents double-booking.
- The clinic signs in (Supabase Auth) to a private admin page to manage doctors, working
  hours, services and to view/cancel appointments.

## Reasoning
- No server to build or maintain; generous free tier (≈$0/month at clinic scale).
- Postgres gives real constraints (no double-booking) and RLS for privacy.
- Keeps the frontend static — no build step, deploy anywhere.
- Alternatives considered: custom Node/Express + DB (more to host/maintain);
  Google Sheets backend (familiar but weak concurrency, hacky); embedding a 3rd-party
  platform like Fresha (real but less branding/control, possible fees).

## Consequences
- The clinic must own a Supabase project (free account) — the database lives in THEIR account.
- The Supabase **anon key** ships in the frontend (this is expected and safe; it is
  protected by RLS). The **service_role key** stays secret (never in the frontend/git).
- Phase 1 ships the booking UI on a sample schedule (`booking.js` DATA layer). Phase 2
  swaps that DATA layer for Supabase calls; Phase 3 adds the admin page.
- See [[dental-clinic-gt-site]] memory and `supabase/schema.sql` for the data model.
