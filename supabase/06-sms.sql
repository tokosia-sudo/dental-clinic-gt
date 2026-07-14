-- ============================================================
-- Dental Clinic GT — Patient SMS: booking confirmation + reminder
--
-- 1) Right after a booking is made, the patient gets an SMS:
--    "You are booked at Dental Clinic GT on <date> <time> — <service>".
-- 2) Every evening at 18:00 (Tbilisi) the database texts everyone
--    who has a booking TOMORROW: "Reminder: tomorrow at <time>...".
--
-- SMS provider: smsoffice.ge (Georgian service, ~0.03-0.09 GEL/msg).
-- You need an smsoffice.ge account, a paid package and an API key.
--
-- HOW TO USE (do NOT save the real key in this file — the code
-- repository is public!):
--   1. Copy this whole file into Supabase → SQL Editor → New query.
--   2. Replace PASTE_SMSOFFICE_KEY_HERE with your API key (2 places:
--      confirmation + reminders). If you have an approved sender
--      name, replace PASTE_SENDER_HERE too; otherwise leave it.
--   3. Run. Safe to run again later.
-- ============================================================

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Remembers that a reminder was already sent (no double texts)
alter table appointments add column if not exists reminded_at timestamptz;

-- ---------- helpers ----------

-- %XX-encode any text (Georgian included) for use inside a URL
create or replace function url_encode_text(txt text)
returns text language sql immutable as $$
  select coalesce(string_agg(
    case when c ~ '[A-Za-z0-9._~-]' then c
         else regexp_replace(upper(encode(convert_to(c, 'UTF8'), 'hex')), '(..)', '%\1', 'g')
    end, ''), '')
  from regexp_split_to_table(coalesce(txt, ''), '') as c;
$$;

-- Turn any written form (+995 5xx.., 5xx xx xx xx) into 9955XXXXXXXX; null if not a GE mobile
create or replace function normalize_ge_phone(p text)
returns text language sql immutable as $$
  select case
    when digits like '995%' and length(digits) = 12 then digits
    when length(digits) = 9 and digits like '5%' then '995' || digits
    else null
  end
  from (select regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g') as digits) t;
$$;

-- Send one SMS through smsoffice.ge (never raises — a failed SMS must not break anything)
create or replace function send_clinic_sms(p_phone text, p_body text)
returns void language plpgsql security definer set search_path = public as $$
declare
  api_key text := 'PASTE_SMSOFFICE_KEY_HERE';   -- smsoffice.ge API key
  sender  text := 'PASTE_SENDER_HERE';          -- approved sender name (optional)
  dest    text;
  u       text;
begin
  if api_key like 'PASTE_%' then return; end if;   -- not configured yet
  dest := normalize_ge_phone(p_phone);
  if dest is null then return; end if;             -- not a Georgian mobile — skip

  u := 'https://smsoffice.ge/api/v2/send/?key=' || api_key
    || '&destination=' || dest
    || '&content=' || url_encode_text(p_body);
  if sender not like 'PASTE_%' then
    u := u || '&sender=' || url_encode_text(sender);
  end if;

  begin
    perform net.http_get(u);
  exception when others then
    null;
  end;
end;
$$;

-- ---------- 1) confirmation SMS on every new booking ----------

create or replace function sms_confirm_new_booking()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  svc_name text;
  msg      text;
begin
  select name_ka into svc_name from services where id = new.service_id;
  msg := 'Dental Clinic GT: თქვენ ჩაეწერეთ '
      || to_char(new.starts_at at time zone 'Asia/Tbilisi', 'DD.MM.YYYY') || ' '
      || to_char(new.starts_at at time zone 'Asia/Tbilisi', 'HH24:MI') || '-ზე — '
      || coalesce(svc_name, 'ვიზიტი')
      || '. მის.: ნავთლუღის ქ. 5/7. ტელ: 599 06 11 19';
  perform send_clinic_sms(new.patient_phone, msg);
  return new;
end;
$$;

drop trigger if exists trg_sms_confirm on appointments;
create trigger trg_sms_confirm
  after insert on appointments
  for each row execute function sms_confirm_new_booking();

-- ---------- 2) reminder SMS the evening before ----------

create or replace function send_tomorrow_reminders()
returns void language plpgsql security definer set search_path = public as $$
declare
  r   record;
  msg text;
begin
  for r in
    select a.id, a.starts_at, a.patient_phone, s.name_ka as svc_name
    from appointments a
    left join services s on s.id = a.service_id
    where a.status = 'booked'
      and a.reminded_at is null
      and (a.starts_at at time zone 'Asia/Tbilisi')::date
          = (now() at time zone 'Asia/Tbilisi')::date + 1
  loop
    msg := 'შეხსენება: ხვალ '
        || to_char(r.starts_at at time zone 'Asia/Tbilisi', 'HH24:MI')
        || '-ზე ჩაწერილი ხართ Dental Clinic GT-ში — '
        || coalesce(r.svc_name, 'ვიზიტი')
        || '. მის.: ნავთლუღის ქ. 5/7. ტელ: 599 06 11 19';
    perform send_clinic_sms(r.patient_phone, msg);
    update appointments set reminded_at = now() where id = r.id;
  end loop;
end;
$$;

-- Every day at 14:00 UTC = 18:00 Tbilisi (Georgia has no clock changes)
select cron.schedule('sms-reminders-daily', '0 14 * * *', $$select send_tomorrow_reminders()$$);
