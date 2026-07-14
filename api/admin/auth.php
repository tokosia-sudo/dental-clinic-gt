<?php
/* ============================================================
   Staff sign-in (secure PHP session, bcrypt passwords):
     GET               → { authed: true|false }
     POST {action:'login', email, password}
     POST {action:'logout'}
   Rate limit: max 5 attempts per minute per IP.
   ============================================================ */
require __DIR__ . '/../helpers.php';

session_boot();

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET') {
  json_out(['authed' => staff_id() !== null]);
}

check_origin();
$in = read_json();
$action = $in['action'] ?? '';

if ($action === 'logout') {
  $_SESSION = [];
  session_destroy();
  json_out(['ok' => true]);
}

if ($action === 'login') {
  $email = strtolower(trim((string)($in['email'] ?? '')));
  $pass = (string)($in['password'] ?? '');
  $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';

  // brute-force guard
  $pdo = db();
  $pdo->prepare('DELETE FROM login_attempts WHERE attempted_at < ?')
      ->execute([date('Y-m-d H:i:s', time() - 900)]);
  $q = $pdo->prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ? AND attempted_at > ?');
  $q->execute([$ip, date('Y-m-d H:i:s', time() - 60)]);
  if ((int)$q->fetch()['n'] >= 5) json_err('rate_limited', 429);
  $pdo->prepare('INSERT INTO login_attempts (ip, attempted_at) VALUES (?, ?)')
      ->execute([$ip, date('Y-m-d H:i:s')]);

  $u = $pdo->prepare('SELECT id, password_hash FROM staff_users WHERE email = ? AND active = 1');
  $u->execute([$email]);
  $u = $u->fetch();
  if (!$u || !password_verify($pass, $u['password_hash'])) {
    json_err('bad_credentials', 401);
  }

  session_regenerate_id(true);
  $_SESSION['staff_id'] = (int)$u['id'];
  json_out(['ok' => true]);
}

json_err('bad_request');
