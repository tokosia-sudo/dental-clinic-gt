<?php
/* ============================================================
   Everything the admin panel needs, in one call (staff only):
   all services, all doctors (incl. inactive), hours, and all
   appointments with patient details + payments.
   ============================================================ */
require __DIR__ . '/../helpers.php';
require_staff();

$pdo = db();

$services = array_map(fn($s) => [
  'id' => $s['id'], 'name_ka' => $s['name_ka'], 'name_en' => $s['name_en'],
  'dur' => (int)$s['duration_min'],
  'priceFrom' => $s['price_from'] !== null ? (int)$s['price_from'] : null,
  'priceTo' => $s['price_to'] !== null ? (int)$s['price_to'] : null,
  'active' => (bool)$s['active'], 'sort' => (int)$s['sort'],
], $pdo->query('SELECT * FROM services ORDER BY sort')->fetchAll());

$ds = $pdo->query('SELECT doctor_id, service_id FROM doctor_services')->fetchAll();
$byDoc = [];
foreach ($ds as $row) $byDoc[$row['doctor_id']][] = $row['service_id'];

$doctors = array_map(fn($d) => [
  'id' => $d['id'], 'slug' => $d['slug'], 'name' => $d['name'],
  'role_ka' => $d['role_ka'], 'role_en' => $d['role_en'], 'roleKey' => '',
  'services' => $byDoc[$d['id']] ?? [],
  'active' => (bool)$d['active'], 'sort' => (int)$d['sort'],
], $pdo->query('SELECT * FROM doctors ORDER BY sort')->fetchAll());

$appts = array_map(fn($a) => [
  'id' => (int)$a['id'],
  'doctorId' => $a['doctor_id'],
  'serviceId' => $a['service_id'],
  'dateISO' => substr($a['starts_at'], 0, 10),
  'time' => substr($a['starts_at'], 11, 5),
  'durationMin' => (int)round((strtotime($a['ends_at']) - strtotime($a['starts_at'])) / 60),
  'patientName' => $a['patient_name'],
  'patientPhone' => $a['patient_phone'],
  'patientEmail' => $a['patient_email'],
  'note' => $a['note'],
  'channel' => $a['channel'] ?: 'online',
  'status' => $a['status'],
  'payments' => $a['payments'] !== null ? json_decode($a['payments'], true) : null,
], $pdo->query('SELECT * FROM appointments ORDER BY starts_at')->fetchAll());

/* hours: same aggregation as the public endpoint */
$rows = $pdo->query('SELECT weekday, start_min, end_min FROM working_hours')->fetchAll();
$hours = ['openMin' => 600, 'closeMin' => 1080, 'satCloseMin' => 960, 'stepMin' => 30, 'days' => [1, 2, 3, 4, 5, 6]];
if ($rows) {
  $days = array_values(array_unique(array_map(fn($r) => (int)$r['weekday'], $rows)));
  sort($days);
  $wk  = array_filter($rows, fn($r) => $r['weekday'] >= 1 && $r['weekday'] <= 5);
  $sat = array_filter($rows, fn($r) => (int)$r['weekday'] === 6);
  $open  = min(array_map(fn($r) => (int)$r['start_min'], $rows));
  $close = $wk ? max(array_map(fn($r) => (int)$r['end_min'], $wk))
               : max(array_map(fn($r) => (int)$r['end_min'], $rows));
  $satClose = $sat ? max(array_map(fn($r) => (int)$r['end_min'], $sat)) : $close;
  $hours = ['openMin' => $open, 'closeMin' => $close, 'satCloseMin' => $satClose, 'stepMin' => 30, 'days' => $days];
}

json_out(['services' => $services, 'doctors' => $doctors, 'hours' => $hours, 'appointments' => $appts]);
