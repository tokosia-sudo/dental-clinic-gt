-- ============================================================
-- Dental Clinic GT — Telegram notifications for new bookings
--
-- Every new booking (online, phone, messenger, walk-in) makes the
-- clinic's Telegram bot post a message into your staff group.
--
-- HOW TO USE (do NOT save the real token in this file — the code
-- repository is public!):
--   1. Copy this whole file into Supabase → SQL Editor → New query.
--   2. In the editor, replace the two PASTE_..._HERE values below
--      with your bot token and group chat id.
--   3. Run. Safe to run again later (e.g. to change the group).
-- ============================================================

-- Lets the database make outgoing web requests (built into Supabase)
create extension if not exists pg_net;

create or replace function notify_telegram_new_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  bot_token text := 'PASTE_BOT_TOKEN_HERE';      -- from @BotFather
  chat_id   text := 'PASTE_GROUP_CHAT_ID_HERE';  -- group id, starts with a minus
  doc_name  text;
  svc_name  text;
  chan_ka   text;
  msg       text;
begin
  -- Not configured yet — do nothing, never block the booking itself.
  if bot_token like 'PASTE_%' then return new; end if;

  select name into doc_name from doctors where id = new.doctor_id;
  select name_ka into svc_name from services where id = new.service_id;
  chan_ka := case coalesce(new.channel, 'online')
    when 'online' then 'ონლაინ'
    when 'phone' then 'ტელეფონი'
    when 'messenger' then 'მესენჯერი'
    when 'walkin' then 'ადგილზე'
    else coalesce(new.channel, '') end;

  msg := '🦷 ახალი ჯავშანი (' || chan_ka || ')' || E'\n'
      || '📅 ' || to_char(new.starts_at at time zone 'Asia/Tbilisi', 'DD.MM.YYYY')
      || ' · ' || to_char(new.starts_at at time zone 'Asia/Tbilisi', 'HH24:MI')
      || '–'  || to_char(new.ends_at   at time zone 'Asia/Tbilisi', 'HH24:MI') || E'\n'
      || '🩺 ' || coalesce(doc_name, '?') || ' — ' || coalesce(svc_name, '?') || E'\n'
      || '👤 ' || new.patient_name || ' · ' || new.patient_phone
      || case when new.note is not null and new.note <> ''
              then E'\n' || '📝 ' || new.note else '' end;

  begin
    perform net.http_post(
      url  := 'https://api.telegram.org/bot' || bot_token || '/sendMessage',
      body := jsonb_build_object('chat_id', chat_id, 'text', msg)
    );
  exception when others then
    null;  -- a notification problem must never break the booking
  end;

  return new;
end;
$$;

drop trigger if exists trg_notify_telegram on appointments;
create trigger trg_notify_telegram
  after insert on appointments
  for each row execute function notify_telegram_new_booking();
