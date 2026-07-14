<?php
/* ============================================================
   One-time staff-user creation, protected by the setup_key
   from config.local.php. Open in the browser:

     /api/admin/setup.php?key=YOUR_SETUP_KEY&email=me@x.ge&password=Str0ngPass

   Creates (or updates the password of) that staff user.
   After creating your user, change setup_key in the config
   or delete this file from the server.
   ============================================================ */
require __DIR__ . '/../helpers.php';

$key = (string)($_GET['key'] ?? '');
$expected = (string)cfg('setup_key', '');
if ($expected === '' || strpos($expected, 'PASTE_') === 0 || !hash_equals($expected, $key)) {
  json_err('forbidden', 403);
}

$email = strtolower(trim((string)($_GET['email'] ?? '')));
$pass = (string)($_GET['password'] ?? '');
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) json_err('email');
if (strlen($pass) < 8) json_err('password_too_short');

$hash = password_hash($pass, PASSWORD_DEFAULT);
$pdo = db();
$st = $pdo->prepare(
  'INSERT INTO staff_users (email, password_hash, active) VALUES (?, ?, 1)
   ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), active = 1'
);
$st->execute([$email, $hash]);

json_out(['ok' => true, 'email' => $email, 'note' => 'Now change setup_key in config.local.php or delete setup.php']);
