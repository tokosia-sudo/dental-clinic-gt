<?php
/* ============================================================
   Day-before SMS reminders. cPanel → Cron Jobs, daily at 18:00:

     php /home/USERNAME/public_html/api/cron/reminders.php CRON_KEY

   (or via URL: /api/cron/reminders.php?key=CRON_KEY)
   Texts every patient booked for TOMORROW, once (reminded_at guard).
   ============================================================ */
require __DIR__ . '/../helpers.php';

$key = $_GET['key'] ?? ($argv[1] ?? '');
$expected = (string)cfg('cron_key', '');
if ($expected === '' || strpos($expected, 'PASTE_') === 0 || !hash_equals($expected, (string)$key)) {
  json_err('forbidden', 403);
}

$tomorrow = date('Y-m-d', strtotime('+1 day'));
$pdo = db();
$rows = $pdo->prepare(
  "SELECT a.id, a.starts_at, a.patient_phone, s.name_ka AS svc_name
   FROM appointments a
   LEFT JOIN services s ON s.id = a.service_id
   WHERE a.status = 'booked' AND a.reminded_at IS NULL
     AND a.starts_at >= ? AND a.starts_at < ?"
);
$rows->execute([$tomorrow . ' 00:00:00', $tomorrow . ' 23:59:59']);

$sent = 0;
foreach ($rows->fetchAll() as $r) {
  $msg = 'შეხსენება: ხვალ ' . date('H:i', strtotime($r['starts_at']))
       . '-ზე ჩაწერილი ხართ Dental Clinic GT-ში — '
       . ($r['svc_name'] ?: 'ვიზიტი') . '.' . cfg('sms_footer', '');
  sms_send($r['patient_phone'], $msg);
  $pdo->prepare('UPDATE appointments SET reminded_at = NOW() WHERE id = ?')->execute([$r['id']]);
  $sent++;
}

json_out(['ok' => true, 'sent' => $sent, 'for' => $tomorrow]);
