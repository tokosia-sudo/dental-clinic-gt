<?php
/* ============================================================
   Dental Clinic GT — server configuration (EXAMPLE)

   On the cloud9 server: copy this file to  config.local.php
   and fill in the real values there.  config.local.php is
   git-ignored and must NEVER be committed — the repository
   is public.
   ============================================================ */
return [
  // MySQL — created in cPanel → MySQL Databases
  'db_host' => 'localhost',
  'db_name' => 'PASTE_DB_NAME',
  'db_user' => 'PASTE_DB_USER',
  'db_pass' => 'PASTE_DB_PASSWORD',

  // Telegram staff-group notifications (same bot as before)
  'telegram_token'   => '',          // from @BotFather; empty = disabled
  'telegram_chat_id' => '',          // group id, starts with a minus

  // Patient SMS via smsoffice.ge
  'smsoffice_key' => '',             // API key; empty = SMS disabled
  'sms_sender'    => '',             // approved sender name; empty = default

  // Text appended to every patient SMS (address + phone)
  'sms_footer' => ' მის.: ნავთლუღის ქ. 5/7. ტელ: 599 06 11 19',

  // Secret for the daily reminders cron URL (invent a long random string)
  'cron_key' => 'PASTE_LONG_RANDOM_STRING',

  // One-time secret for creating the first admin user via setup.php
  'setup_key' => 'PASTE_ANOTHER_LONG_RANDOM_STRING',
];
