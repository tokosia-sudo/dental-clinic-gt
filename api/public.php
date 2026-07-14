<?php
/* ============================================================
   Public read-only API (no login needed):
     public.php?what=catalog  → services, doctors, hours
     public.php?what=busy     → occupied time windows (NO patient data)
   ============================================================ */
require __DIR__ . '/helpers.php';

$what = $_GET['what'] ?? '';

if ($what === 'catalog') {
  $services = db()->query(
    'SELECT id, name_ka, name_en, duration_min, price_from, price_to, active, sort
     FROM services WHERE active = 1 ORDER BY sort'
  )->fetchAll();
  $docs = db()->query(
    'SELECT id, name, active FROM doctors WHERE active = 1 ORDER BY sort'
  )->fetchAll();
  $ds = db()->query('SELECT doctor_id, service_id FROM doctor_services')->fetchAll();
  $byDoc = [];
  foreach ($ds as $row) $byDoc[$row['doctor_id']][] = $row['service_id'];

  $out = [
    'services' => array_map(fn($s) => [
      'id' => $s['id'], 'name_ka' => $s['name_ka'], 'name_en' => $s['name_en'],
      'dur' => (int)$s['duration_min'],
      'priceFrom' => $s['price_from'] !== null ? (int)$s['price_from'] : null,
      'priceTo' => $s['price_to'] !== null ? (int)$s['price_to'] : null,
      'active' => (bool)$s['active'], 'sort' => (int)$s['sort'],
    ], $services),
    'doctors' => array_map(fn($d) => [
      'id' => $d['id'], 'name' => $d['name'], 'active' => (bool)$d['active'],
      'services' => $byDoc[$d['id']] ?? [],
    ], $docs),
    'hours' => aggregate_hours(),
  ];
  json_out($out);
}

if ($what === 'busy') {
  // Today onwards; both booked and finished visits block their slot.
  $rows = db()->prepare(
    "SELECT doctor_id, service_id, starts_at, ends_at FROM appointments
     WHERE status IN ('booked','done') AND starts_at >= ?"
  );
  $rows->execute([date('Y-m-d') . ' 00:00:00']);
  $out = [];
  foreach ($rows->fetchAll() as $b) {
    $out[] = [
      'doctorId' => $b['doctor_id'],
      'serviceId' => $b['service_id'],
      'dateISO' => substr($b['starts_at'], 0, 10),
      'time' => substr($b['starts_at'], 11, 5),
      'durationMin' => (int)round((strtotime($b['ends_at']) - strtotime($b['starts_at'])) / 60),
    ];
  }
  json_out($out);
}

json_err('not_found', 404);

/* Aggregate per-doctor weekly rows into the clinic-wide shape the site uses. */
function aggregate_hours(): array {
  $rows = db()->query('SELECT weekday, start_min, end_min FROM working_hours')->fetchAll();
  $h = ['openMin' => 600, 'closeMin' => 1080, 'satCloseMin' => 960, 'stepMin' => 30, 'days' => [1, 2, 3, 4, 5, 6]];
  if (!$rows) return $h;
  $days = array_values(array_unique(array_map(fn($r) => (int)$r['weekday'], $rows)));
  sort($days);
  $wk  = array_filter($rows, fn($r) => $r['weekday'] >= 1 && $r['weekday'] <= 5);
  $sat = array_filter($rows, fn($r) => (int)$r['weekday'] === 6);
  $open  = min(array_map(fn($r) => (int)$r['start_min'], $rows));
  $close = $wk ? max(array_map(fn($r) => (int)$r['end_min'], $wk))
               : max(array_map(fn($r) => (int)$r['end_min'], $rows));
  $satClose = $sat ? max(array_map(fn($r) => (int)$r['end_min'], $sat)) : $close;
  return ['openMin' => $open, 'closeMin' => $close, 'satCloseMin' => $satClose, 'stepMin' => 30, 'days' => $days];
}
