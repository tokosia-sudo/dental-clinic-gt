<?php
/* ============================================================
   Site photo upload (staff only). POST multipart form:
     slot  = 'hero' | 'about'
     photo = a JPEG file, max 5MB
   Overwrites images/hero.jpg or images/about.jpg and bumps the
   photo version so browsers pick up the new picture immediately.
   ============================================================ */
require __DIR__ . '/../helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') json_err('method', 405);
check_origin();
require_staff();

$slot = $_POST['slot'] ?? '';
if (!in_array($slot, ['hero', 'about'], true)) json_err('invalid');

$f = $_FILES['photo'] ?? null;
if (!$f || ($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) json_err('no_file');
if ($f['size'] > 5 * 1024 * 1024) json_err('too_large');
if (!is_uploaded_file($f['tmp_name'])) json_err('invalid');

// Check the actual file content (magic bytes), not the file name.
$info = @getimagesize($f['tmp_name']);
if (!$info || ($info['mime'] ?? '') !== 'image/jpeg') json_err('not_jpeg');

$dest = dirname(__DIR__, 2) . '/images/' . $slot . '.jpg';
if (!move_uploaded_file($f['tmp_name'], $dest)) json_err('error', 500);
@chmod($dest, 0644);

// Bump the version so the homepage loads the fresh photo (cache-busting).
$ver = (string)time();
db()->prepare('INSERT INTO site_content (k, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = VALUES(v)')
    ->execute(['img_ver_' . $slot, $ver]);

json_out(['ok' => true, 'slot' => $slot, 'version' => $ver]);
