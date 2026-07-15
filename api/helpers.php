<?php
/* ============================================================
   Dental Clinic GT — shared API helpers (config, DB, auth,
   JSON I/O, Telegram + SMS senders). All times Tbilisi local.
   ============================================================ */
declare(strict_types=1);

date_default_timezone_set('Asia/Tbilisi');

/* Any unexpected crash returns clean JSON instead of a blank 500 page
   (and never leaks internal details to visitors). */
set_exception_handler(function (Throwable $e) {
  http_response_code(500);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['ok' => false, 'reason' => 'server_error']);
  exit;
});

function cfg(string $key, $default = null) {
  static $c = null;
  if ($c === null) {
    $file = __DIR__ . '/config.local.php';
    $c = is_file($file) ? require $file : [];
  }
  return $c[$key] ?? $default;
}

function db(): PDO {
  static $pdo = null;
  if ($pdo === null) {
    if (!is_file(__DIR__ . '/config.local.php')) json_err('config_missing', 500);
    if (strpos((string)cfg('db_name', ''), 'PASTE_') === 0) json_err('config_not_filled', 500);
    try {
      $pdo = new PDO(
        'mysql:host=' . cfg('db_host', 'localhost') . ';dbname=' . cfg('db_name') . ';charset=utf8mb4',
        cfg('db_user'), cfg('db_pass'),
        [
          PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
          PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
          PDO::ATTR_EMULATE_PREPARES => false,
        ]
      );
      // The booking overlap lock relies on gap-locking, which needs this level.
      $pdo->exec('SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    } catch (PDOException $e) {
      json_err('db_connect_failed', 500); // wrong db name/user/password in config.local.php
    }
  }
  return $pdo;
}

/* ---------- JSON I/O ---------- */
function json_out($data, int $status = 200): void {
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  header('X-Content-Type-Options: nosniff');
  header('Cache-Control: no-store');
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}
function json_err(string $reason, int $status = 400): void {
  json_out(['ok' => false, 'reason' => $reason], $status);
}
function read_json(): array {
  $raw = file_get_contents('php://input');
  if ($raw === false || strlen($raw) > 100000) json_err('bad_request');
  $d = json_decode($raw, true);
  return is_array($d) ? $d : [];
}

/* Same-origin guard for state-changing requests (browsers always send
   Origin on cross-site POST; same-origin fetch sends it too). */
function check_origin(): void {
  $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
  if ($origin === '') return; // non-browser client (e.g. cron) — other guards apply
  $host = $_SERVER['HTTP_HOST'] ?? '';
  if (parse_url($origin, PHP_URL_HOST) !== preg_replace('/:\d+$/', '', $host)) {
    json_err('forbidden', 403);
  }
}

/* ---------- staff session ---------- */
function session_boot(): void {
  if (session_status() === PHP_SESSION_ACTIVE) return;
  // Private session store + 12h lifetime, so shared-host garbage collection
  // (default ~24 min) never logs staff out mid-shift.
  $sessDir = __DIR__ . '/sessions';
  if (!is_dir($sessDir)) {
    @mkdir($sessDir, 0700, true);
    @file_put_contents($sessDir . '/.htaccess', "Require all denied\n");
  }
  if (is_dir($sessDir) && is_writable($sessDir)) session_save_path($sessDir);
  ini_set('session.gc_maxlifetime', '43200');
  session_name('dcgt_admin');
  session_set_cookie_params([
    'lifetime' => 43200,
    'path' => '/',
    'secure' => !empty($_SERVER['HTTPS']),
    'httponly' => true,
    'samesite' => 'Lax',
  ]);
  session_start();
}
function staff_id(): ?int {
  session_boot();
  return isset($_SESSION['staff_id']) ? (int)$_SESSION['staff_id'] : null;
}
function require_staff(): int {
  $id = staff_id();
  if ($id === null) json_err('unauthorized', 401);
  return $id;
}

/* ---------- misc ---------- */
function uuid4(): string {
  $b = random_bytes(16);
  $b[6] = chr((ord($b[6]) & 0x0f) | 0x40);
  $b[8] = chr((ord($b[8]) & 0x3f) | 0x80);
  return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4));
}
function valid_date(string $d): bool { return (bool)preg_match('/^\d{4}-\d{2}-\d{2}$/', $d); }
function valid_time(string $t): bool { return (bool)preg_match('/^\d{2}:\d{2}$/', $t); }
function valid_phone(string $p): bool { return (bool)preg_match('/^\+?[0-9\s\-()]{6,20}$/', $p); }

function normalize_ge_phone(string $p): ?string {
  $digits = preg_replace('/\D/', '', $p);
  if (strpos($digits, '995') === 0 && strlen($digits) === 12) return $digits;
  if (strlen($digits) === 9 && $digits[0] === '5') return '995' . $digits;
  return null;
}

/* ---------- outbound notifications (must never break a booking) ---------- */
function http_get_quiet(string $url): void {
  try {
    $ctx = stream_context_create(['http' => ['timeout' => 4, 'ignore_errors' => true]]);
    @file_get_contents($url, false, $ctx);
  } catch (Throwable $e) { /* ignore */ }
}
function http_post_json_quiet(string $url, array $body): void {
  try {
    $ctx = stream_context_create(['http' => [
      'method' => 'POST',
      'header' => "Content-Type: application/json\r\n",
      'content' => json_encode($body, JSON_UNESCAPED_UNICODE),
      'timeout' => 4,
      'ignore_errors' => true,
    ]]);
    @file_get_contents($url, false, $ctx);
  } catch (Throwable $e) { /* ignore */ }
}

/* Post a "new booking" card into the staff Telegram group. */
function telegram_notify_booking(array $a): void {
  $token = (string)cfg('telegram_token', '');
  $chat  = (string)cfg('telegram_chat_id', '');
  if ($token === '' || $chat === '') return;
  $chanKa = ['online' => 'ონლაინ', 'phone' => 'ტელეფონი', 'messenger' => 'მესენჯერი', 'walkin' => 'ადგილზე'][$a['channel'] ?? 'online'] ?? ($a['channel'] ?? '');
  $msg = "🦷 ახალი ჯავშანი ({$chanKa})\n"
       . '📅 ' . date('d.m.Y', strtotime($a['starts_at'])) . ' · '
       . date('H:i', strtotime($a['starts_at'])) . '–' . date('H:i', strtotime($a['ends_at'])) . "\n"
       . '🩺 ' . ($a['doctor_name'] ?? '?') . ' — ' . ($a['service_name'] ?? '?') . "\n"
       . '👤 ' . $a['patient_name'] . ' · ' . $a['patient_phone']
       . (!empty($a['note']) ? "\n📝 " . $a['note'] : '');
  http_post_json_quiet("https://api.telegram.org/bot{$token}/sendMessage", ['chat_id' => $chat, 'text' => $msg]);
}

/* Send one SMS to a patient via smsoffice.ge. */
function sms_send(string $phone, string $body): void {
  $key = (string)cfg('smsoffice_key', '');
  if ($key === '') return;
  $dest = normalize_ge_phone($phone);
  if ($dest === null) return;
  $url = 'https://smsoffice.ge/api/v2/send/?key=' . rawurlencode($key)
       . '&destination=' . $dest
       . '&content=' . rawurlencode($body);
  $sender = (string)cfg('sms_sender', '');
  if ($sender !== '') $url .= '&sender=' . rawurlencode($sender);
  http_get_quiet($url);
}

function sms_confirm_booking(array $a): void {
  $msg = 'Dental Clinic GT: თქვენ ჩაეწერეთ '
       . date('d.m.Y H:i', strtotime($a['starts_at'])) . '-ზე — '
       . ($a['service_name'] ?? 'ვიზიტი') . '.' . cfg('sms_footer', '');
  sms_send($a['patient_phone'], $msg);
}
