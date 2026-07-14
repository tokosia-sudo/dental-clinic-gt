<?php
/* ============================================================
   Public online booking (POST JSON):
     { doctorId, serviceId, dateISO, time, patientName,
       patientPhone, patientEmail?, note? }
   Validates everything server-side; a transaction + the
   UNIQUE(doctor_id, starts_at) key make double-booking
   impossible even for two people clicking at once.
   ============================================================ */
require __DIR__ . '/helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') json_err('method', 405);
check_origin();
$in = read_json();

$doctorId = trim((string)($in['doctorId'] ?? ''));
$serviceId = trim((string)($in['serviceId'] ?? ''));
$dateISO = trim((string)($in['dateISO'] ?? ''));
$time = trim((string)($in['time'] ?? ''));
$name = trim((string)($in['patientName'] ?? ''));
$phone = trim((string)($in['patientPhone'] ?? ''));
$email = trim((string)($in['patientEmail'] ?? ''));
$note = trim((string)($in['note'] ?? ''));

if (!valid_date($dateISO) || !valid_time($time)) json_err('invalid');
if (mb_strlen($name) < 2 || mb_strlen($name) > 200) json_err('name');
if (!valid_phone($phone)) json_err('phone');
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) json_err('email');
if (mb_strlen($note) > 1000) $note = mb_substr($note, 0, 1000);

$svc = db()->prepare('SELECT id, name_ka, duration_min FROM services WHERE id = ? AND active = 1');
$svc->execute([$serviceId]);
$svc = $svc->fetch();
if (!$svc) json_err('invalid');

$doc = db()->prepare(
  'SELECT d.id, d.name FROM doctors d
   JOIN doctor_services ds ON ds.doctor_id = d.id AND ds.service_id = ?
   WHERE d.id = ? AND d.active = 1'
);
$doc->execute([$serviceId, $doctorId]);
$doc = $doc->fetch();
if (!$doc) json_err('invalid');

$startsAt = $dateISO . ' ' . $time . ':00';
$endsAt = date('Y-m-d H:i:s', strtotime($startsAt) + (int)$svc['duration_min'] * 60);
if (strtotime($startsAt) <= time()) json_err('past');

$pdo = db();
try {
  $pdo->beginTransaction();
  // Lock this doctor's overlapping rows; blocks a simultaneous booking.
  $q = $pdo->prepare(
    "SELECT id FROM appointments
     WHERE doctor_id = ? AND status <> 'cancelled' AND starts_at < ? AND ends_at > ?
     FOR UPDATE"
  );
  $q->execute([$doctorId, $endsAt, $startsAt]);
  if ($q->fetch()) { $pdo->rollBack(); json_err('taken', 409); }

  // A previously CANCELLED booking at this exact time would still trip the
  // unique key — clear it so the freed slot is genuinely bookable again.
  $pdo->prepare("DELETE FROM appointments WHERE doctor_id = ? AND starts_at = ? AND status = 'cancelled'")
      ->execute([$doctorId, $startsAt]);

  $ins = $pdo->prepare(
    'INSERT INTO appointments
       (doctor_id, service_id, starts_at, ends_at, patient_name, patient_phone, patient_email, note, channel, status)
     VALUES (?,?,?,?,?,?,?,?,?,?)'
  );
  $ins->execute([
    $doctorId, $serviceId, $startsAt, $endsAt, $name, $phone,
    $email !== '' ? $email : null, $note !== '' ? $note : null, 'online', 'booked',
  ]);
  $id = (int)$pdo->lastInsertId();
  $pdo->commit();
} catch (PDOException $e) {
  if ($pdo->inTransaction()) $pdo->rollBack();
  // 23000 = unique key hit, 40001 = deadlock between two simultaneous bookings —
  // either way the other booking won, so this slot is taken.
  if (in_array((string)$e->getCode(), ['23000', '40001'], true)) json_err('taken', 409);
  json_err('error', 500);
}

// Notifications go out only after the booking is safely saved.
$notify = [
  'starts_at' => $startsAt, 'ends_at' => $endsAt, 'channel' => 'online',
  'doctor_name' => $doc['name'], 'service_name' => $svc['name_ka'],
  'patient_name' => $name, 'patient_phone' => $phone, 'note' => $note,
];
telegram_notify_booking($notify);
sms_confirm_booking($notify);

json_out(['ok' => true, 'id' => $id]);
