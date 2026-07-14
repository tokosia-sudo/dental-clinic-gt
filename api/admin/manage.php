<?php
/* ============================================================
   All admin write operations (staff only). POST JSON:
     {entity:'appointment', action:'create'|'cancel'|'complete', ...}
     {entity:'doctor',      action:'upsert'|'delete', ...}
     {entity:'service',     action:'upsert', ...}
     {entity:'hours',       action:'set', ...}
   ============================================================ */
require __DIR__ . '/../helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') json_err('method', 405);
check_origin();
require_staff();

$in = read_json();
$entity = $in['entity'] ?? '';
$action = $in['action'] ?? '';
$pdo = db();

/* ---------------- appointments ---------------- */
if ($entity === 'appointment' && $action === 'create') {
  $doctorId = trim((string)($in['doctorId'] ?? ''));
  $serviceId = trim((string)($in['serviceId'] ?? ''));
  $dateISO = trim((string)($in['dateISO'] ?? ''));
  $time = trim((string)($in['time'] ?? ''));
  $name = trim((string)($in['patientName'] ?? ''));
  $phone = trim((string)($in['patientPhone'] ?? ''));
  $note = trim((string)($in['note'] ?? ''));
  $channel = in_array($in['channel'] ?? '', ['online', 'phone', 'messenger', 'walkin'], true) ? $in['channel'] : 'phone';

  if (!valid_date($dateISO) || !valid_time($time)) json_err('invalid');
  if (mb_strlen($name) < 2) json_err('name');
  if (!valid_phone($phone)) json_err('phone');

  $svc = $pdo->prepare('SELECT id, name_ka, duration_min FROM services WHERE id = ?');
  $svc->execute([$serviceId]);
  $svc = $svc->fetch();
  $doc = $pdo->prepare('SELECT id, name FROM doctors WHERE id = ?');
  $doc->execute([$doctorId]);
  $doc = $doc->fetch();
  if (!$svc || !$doc) json_err('invalid');

  $startsAt = $dateISO . ' ' . $time . ':00';
  $endsAt = date('Y-m-d H:i:s', strtotime($startsAt) + (int)$svc['duration_min'] * 60);

  try {
    $pdo->beginTransaction();
    $q = $pdo->prepare(
      "SELECT id FROM appointments
       WHERE doctor_id = ? AND status <> 'cancelled' AND starts_at < ? AND ends_at > ? FOR UPDATE"
    );
    $q->execute([$doctorId, $endsAt, $startsAt]);
    if ($q->fetch()) { $pdo->rollBack(); json_err('taken', 409); }
    $pdo->prepare("DELETE FROM appointments WHERE doctor_id = ? AND starts_at = ? AND status = 'cancelled'")
        ->execute([$doctorId, $startsAt]);
    $ins = $pdo->prepare(
      'INSERT INTO appointments
         (doctor_id, service_id, starts_at, ends_at, patient_name, patient_phone, patient_email, note, channel, status)
       VALUES (?,?,?,?,?,?,?,?,?,?)'
    );
    $ins->execute([$doctorId, $serviceId, $startsAt, $endsAt, $name, $phone, null, $note !== '' ? $note : null, $channel, 'booked']);
    $id = (int)$pdo->lastInsertId();
    $pdo->commit();
  } catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    if (in_array((string)$e->getCode(), ['23000', '40001'], true)) json_err('taken', 409);
    json_err('error', 500);
  }

  $notify = [
    'starts_at' => $startsAt, 'ends_at' => $endsAt, 'channel' => $channel,
    'doctor_name' => $doc['name'], 'service_name' => $svc['name_ka'],
    'patient_name' => $name, 'patient_phone' => $phone, 'note' => $note,
  ];
  telegram_notify_booking($notify);
  sms_confirm_booking($notify);
  json_out(['ok' => true, 'id' => $id]);
}

if ($entity === 'appointment' && $action === 'cancel') {
  $st = $pdo->prepare("UPDATE appointments SET status = 'cancelled' WHERE id = ?");
  $st->execute([(int)($in['id'] ?? 0)]);
  json_out(['ok' => true]);
}

if ($entity === 'appointment' && $action === 'complete') {
  $id = (int)($in['id'] ?? 0);
  $pays = $in['payments'] ?? null;
  if (!is_array($pays) || count($pays) < 1 || count($pays) > 2) json_err('invalid');
  $clean = [];
  foreach ($pays as $p) {
    $method = $p['method'] ?? '';
    $amount = $p['amount'] ?? null;
    if (!in_array($method, ['tbc', 'bog', 'cash', 'installment'], true)) json_err('invalid');
    if (!is_numeric($amount) || (float)$amount <= 0) json_err('invalid');
    $clean[] = ['method' => $method, 'amount' => round((float)$amount, 2)];
  }
  $st = $pdo->prepare("UPDATE appointments SET status = 'done', payments = ? WHERE id = ?");
  $st->execute([json_encode($clean), $id]);
  json_out(['ok' => true]);
}

/* ---------------- doctors ---------------- */
if ($entity === 'doctor' && $action === 'upsert') {
  $id = trim((string)($in['id'] ?? ''));
  $isNew = ($id === '');
  if ($isNew) {
    $name = trim((string)($in['name'] ?? ''));
    if (mb_strlen($name) < 2) json_err('name');
    $id = uuid4();
    $sortRow = $pdo->query('SELECT COALESCE(MAX(sort),0)+1 AS s FROM doctors')->fetch();
    $st = $pdo->prepare('INSERT INTO doctors (id, slug, name, role_ka, role_en, active, sort) VALUES (?,?,?,?,?,?,?)');
    $st->execute([$id, 'doc-' . time(), $name,
      ($in['role_ka'] ?? '') !== '' ? $in['role_ka'] : null,
      ($in['role_en'] ?? '') !== '' ? $in['role_en'] : null,
      !empty($in['active'] ?? true) ? 1 : 0, (int)$sortRow['s']]);
  } else {
    $fields = []; $vals = [];
    foreach (['name' => 'name', 'role_ka' => 'role_ka', 'role_en' => 'role_en'] as $k => $col) {
      if (array_key_exists($k, $in) && $in[$k] !== null) { $fields[] = "$col = ?"; $vals[] = (string)$in[$k]; }
    }
    if (array_key_exists('active', $in) && $in['active'] !== null) { $fields[] = 'active = ?'; $vals[] = $in['active'] ? 1 : 0; }
    if ($fields) {
      $vals[] = $id;
      $pdo->prepare('UPDATE doctors SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($vals);
    }
  }
  if (isset($in['services']) && is_array($in['services'])) {
    $pdo->prepare('DELETE FROM doctor_services WHERE doctor_id = ?')->execute([$id]);
    $ins = $pdo->prepare('INSERT IGNORE INTO doctor_services (doctor_id, service_id) VALUES (?, ?)');
    foreach ($in['services'] as $sid) $ins->execute([$id, (string)$sid]);
  }
  json_out(['ok' => true, 'id' => $id]);
}

if ($entity === 'doctor' && $action === 'delete') {
  $pdo->prepare('DELETE FROM doctors WHERE id = ?')->execute([(string)($in['id'] ?? '')]);
  json_out(['ok' => true]);
}

/* ---------------- services ---------------- */
if ($entity === 'service' && $action === 'upsert') {
  $id = trim((string)($in['id'] ?? ''));
  $exists = false;
  if ($id !== '') {
    $q = $pdo->prepare('SELECT id FROM services WHERE id = ?');
    $q->execute([$id]);
    $exists = (bool)$q->fetch();
  }
  if ($exists) {
    $fields = []; $vals = [];
    if (isset($in['dur'])) { $fields[] = 'duration_min = ?'; $vals[] = max(10, min(240, (int)$in['dur'])); }
    if (array_key_exists('priceFrom', $in) && $in['priceFrom'] !== null) { $fields[] = 'price_from = ?'; $vals[] = max(0, (int)$in['priceFrom']); }
    if (array_key_exists('priceTo', $in) && $in['priceTo'] !== null) { $fields[] = 'price_to = ?'; $vals[] = max(0, (int)$in['priceTo']); }
    if (array_key_exists('active', $in) && $in['active'] !== null) { $fields[] = 'active = ?'; $vals[] = $in['active'] ? 1 : 0; }
    if (isset($in['name_ka'])) { $fields[] = 'name_ka = ?'; $vals[] = (string)$in['name_ka']; }
    if (isset($in['name_en'])) { $fields[] = 'name_en = ?'; $vals[] = (string)$in['name_en']; }
    if ($fields) {
      $vals[] = $id;
      $pdo->prepare('UPDATE services SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($vals);
    }
  } else {
    $ka = trim((string)($in['name_ka'] ?? ''));
    $en = trim((string)($in['name_en'] ?? ''));
    if (mb_strlen($ka) < 2 && mb_strlen($en) < 2) json_err('name');
    if ($id === '') $id = 'svc-' . time();
    $sortRow = $pdo->query('SELECT COALESCE(MAX(sort),0)+1 AS s FROM services')->fetch();
    $st = $pdo->prepare('INSERT INTO services (id, name_ka, name_en, duration_min, price_from, price_to, sort, active) VALUES (?,?,?,?,?,?,?,?)');
    $st->execute([$id, $ka !== '' ? $ka : $en, $en !== '' ? $en : $ka,
      max(10, min(240, (int)($in['dur'] ?? 30))),
      isset($in['priceFrom']) ? max(0, (int)$in['priceFrom']) : null,
      isset($in['priceTo']) ? max(0, (int)$in['priceTo']) : null,
      (int)$sortRow['s'], 1]);
  }
  json_out(['ok' => true, 'id' => $id]);
}

/* ---------------- site content (front-page texts) ---------------- */
if ($entity === 'content' && $action === 'set') {
  $items = $in['items'] ?? null;
  if (!is_array($items) || count($items) > 200) json_err('invalid');
  $up = $pdo->prepare('INSERT INTO site_content (k, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = VALUES(v)');
  $del = $pdo->prepare('DELETE FROM site_content WHERE k = ?');
  foreach ($items as $k => $v) {
    if (!is_string($k) || !preg_match('/^(ka|en):[a-zA-Z0-9_]{1,80}$/', $k)) json_err('invalid');
    $v = (string)$v;
    if (mb_strlen($v) > 5000) json_err('invalid');
    // An emptied field returns the site to its built-in default text.
    if (trim($v) === '') $del->execute([$k]);
    else $up->execute([$k, $v]);
  }
  json_out(['ok' => true]);
}

/* ---------------- working hours ---------------- */
if ($entity === 'hours' && $action === 'set') {
  $open = max(0, min(1440, (int)($in['openMin'] ?? 600)));
  $close = max(0, min(1440, (int)($in['closeMin'] ?? 1080)));
  $satClose = max(0, min(1440, (int)($in['satCloseMin'] ?? $close)));
  $days = array_values(array_filter(array_map('intval', (array)($in['days'] ?? [])), fn($d) => $d >= 0 && $d <= 6));
  if ($close <= $open || !$days) json_err('invalid');

  $docs = $pdo->query('SELECT id FROM doctors WHERE active = 1')->fetchAll();
  $pdo->beginTransaction();
  try {
    foreach ($docs as $d) {
      $pdo->prepare('DELETE FROM working_hours WHERE doctor_id = ?')->execute([$d['id']]);
      $ins = $pdo->prepare('INSERT INTO working_hours (doctor_id, weekday, start_min, end_min) VALUES (?,?,?,?)');
      foreach ($days as $wd) $ins->execute([$d['id'], $wd, $open, $wd === 6 ? $satClose : $close]);
    }
    $pdo->commit();
  } catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    json_err('error', 500);
  }
  json_out(['ok' => true]);
}

json_err('bad_request');
