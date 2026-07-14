# Cloud9.ge-ზე გადატანის ინსტრუქცია (Supabase-ის გარეშე)

ეს დოკუმენტი აღწერს, როგორ ეშვება საიტი მთლიანად cloud9.ge-ზე:
საიტი + საკუთარი ბაზა (MySQL) + ჯავშნები + ადმინი + Telegram + SMS.

> მოკლე გეგმა: ყიდვა → ბაზის შექმნა → ფაილების ატვირთვა → კონფიგი →
> ადმინის შექმნა → გადართვა → მონაცემების გადმოტანა → cron → შემოწმება.

---

## 1. რა უნდა იყიდო

- cloud9.ge → Hosting → **Linux Shared — Classic** (₾14/თვე, 3GB)
- დომენი (მაგ. `dentalclinicgt.ge`)

## 2. ბაზის შექმნა (cPanel)

1. cPanel → **MySQL Databases**
2. შექმენი ბაზა (მაგ. `dcgt`) — ჩაინიშნე სრული სახელი (მაგ. `user_dcgt`)
3. შექმენი ბაზის მომხმარებელი ძლიერი პაროლით — ჩაინიშნე
4. **Add User To Database** → მიანიჭე **All Privileges**
5. cPanel → **phpMyAdmin** → აირჩიე ბაზა → **SQL** ჩანართი →
   ჩასვი მთლიანად ფაილი **`sql/mysql-schema.sql`** → Go

## 3. ფაილების ატვირთვა

cPanel → **File Manager** → `public_html` → ატვირთე პროექტის ყველა ფაილი
(ან ZIP-ად და გახსენი იქვე). `supabase/` საქაღალდე საჭირო აღარ არის, მაგრამ
ხელს არ უშლის.

## 4. კონფიგურაცია (საიდუმლოები მხოლოდ სერვერზე!)

1. File Manager-ში `api/config.local.example.php` → **Copy** → სახელად `api/config.local.php`
2. გახსენი რედაქტორით და შეავსე:
   - `db_name`, `db_user`, `db_pass` — მე-2 ნაბიჯიდან
   - `telegram_token`, `telegram_chat_id` — იგივე, რაც ახლა გაქვს
   - `smsoffice_key`, `sms_sender` — როცა გექნება
   - `cron_key`, `setup_key` — მოიფიქრე ორი გრძელი შემთხვევითი სტრიქონი
3. **ეს ფაილი GitHub-ზე არასდროს აიტვირთება** (.gitignore იცავს) — რეალური
   პაროლები მხოლოდ სერვერზე ცხოვრობს.

## 5. ადმინის მომხმარებლის შექმნა

ბრაუზერში გახსენი (შეცვლილი მნიშვნელობებით):

```
https://შენიდომენი.ge/api/admin/setup.php?key=SETUP_KEY&email=შენი@ელფოსტა&password=ძლიერიპაროლი
```

პასუხად `{"ok":true}` უნდა მოვიდეს. ამის შემდეგ **შეცვალე `setup_key`**
კონფიგში ან წაშალე `api/admin/setup.php` სერვერიდან.

## 6. საიტის გადართვა ახალ ბაზაზე

ორი HTML ფაილის თითო ხაზი იცვლება:

**booking.html** — ძველი:
```html
<script src="supabase-config.js" defer></script>
<script src="supabase-data.js" defer></script>
```
ახალი:
```html
<script src="cloud9-data.js" defer></script>
```

**admin.html** — ძველი:
```html
<script src="supabase-config.js" defer></script>
<script src="supabase-admin-data.js" defer></script>
```
ახალი:
```html
<script src="cloud9-admin-data.js" defer></script>
```

## 7. მონაცემების გადმოტანა Supabase-დან

Supabase → SQL Editor-ში გაუშვი ქვემოთ მოcemული ოთხი მოთხოვნა სათითაოდ.
თითოეული **მზა INSERT ბრძანებებს** დაბეჭდავს — დააკოპირე შედეგი და ჩასვი
phpMyAdmin → შენი ბაზა → SQL → Go.

**ექიმები:**
```sql
select string_agg(format(
  'INSERT INTO doctors (id, slug, name, role_ka, role_en, active, sort) VALUES (%L,%L,%L,%L,%L,%s,%s);',
  id, slug, name, role_ka, role_en, case when active then 1 else 0 end, sort), E'\n')
from doctors;
```

**ექიმი↔სერვისი კავშირები:**
```sql
select string_agg(format(
  'INSERT INTO doctor_services (doctor_id, service_id) VALUES (%L,%L);',
  doctor_id, service_id), E'\n')
from doctor_services;
```

**სამუშაო საათები:**
```sql
select string_agg(format(
  'INSERT INTO working_hours (doctor_id, weekday, start_min, end_min) VALUES (%L,%s,%s,%s);',
  doctor_id, weekday, start_min, end_min), E'\n')
from working_hours;
```

**ჯავშნები (დროები თბილისის დროზე გადაყვანილი):**
```sql
select string_agg(format(
  'INSERT INTO appointments (doctor_id, service_id, starts_at, ends_at, patient_name, patient_phone, patient_email, note, channel, status, payments) VALUES (%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%s);',
  doctor_id, service_id,
  to_char(starts_at at time zone 'Asia/Tbilisi', 'YYYY-MM-DD HH24:MI:SS'),
  to_char(ends_at   at time zone 'Asia/Tbilisi', 'YYYY-MM-DD HH24:MI:SS'),
  patient_name, patient_phone, patient_email, note,
  coalesce(channel, 'online'), status,
  coalesce(quote_literal(payments::text), 'NULL')), E'\n')
from appointments;
```

**სერვისების ფასები/სახელები** (თუ ადმინიდან შეცვლილი გაქვს seed-ის შემდეგ):
```sql
select string_agg(format(
  'INSERT INTO services (id, name_ka, name_en, duration_min, price_from, price_to, sort, active) VALUES (%L,%L,%L,%s,%s,%s,%s,%s) ON DUPLICATE KEY UPDATE name_ka=VALUES(name_ka), name_en=VALUES(name_en), duration_min=VALUES(duration_min), price_from=VALUES(price_from), price_to=VALUES(price_to), sort=VALUES(sort), active=VALUES(active);',
  id, name_ka, name_en, duration_min,
  coalesce(price_from::text, 'NULL'), coalesce(price_to::text, 'NULL'),
  sort, case when active then 1 else 0 end), E'\n')
from services;
```

## 8. SMS შეხსენებების cron (როცა smsoffice გექნება)

cPanel → **Cron Jobs** → ახალი:
- დრო: ყოველდღე **18:00** (გადაამოწმე სერვერის საათი — ქართული ჰოსტია, თბილისის დროზეა)
- ბრძანება (შეცვალე USERNAME და CRON_KEY):
```
php /home/USERNAME/public_html/api/cron/reminders.php CRON_KEY
```

## 9. SSL და უსაფრთხოება

- cPanel → **SSL/TLS Status** → AutoSSL ჩართული უნდა იყოს (უფასო)
- ჯავშნის/ადმინის გვერდები HTTPS-ით უნდა იხსნებოდეს

## 10. საბოლოო შემოწმება

- [ ] მთავარი გვერდი იხსნება დომენზე
- [ ] booking.html აჩვენებს სერვისებს/ექიმებს/თავისუფალ დროებს
- [ ] სატესტო ჯავშანი კეთდება; Telegram-ში მოდის; ორმაგი ჯავშანი ბლოკავს
- [ ] admin.html შესვლა ახალი ელფოსტით/პაროლით მუშაობს
- [ ] განრიგი, დასრულება გადახდით, რეპორტი, Excel — ყველა მუშაობს
- [ ] ძველი ჯავშნები ჩანს (მიგრაციის შემდეგ)
- [ ] ადმინში ჩანს „საიტი" ტაბი — ტექსტის შეცვლა და ფოტოს ატვირთვა მუშაობს
      (ეს ტაბი მხოლოდ cloud9-ზე ჩნდება; ატვირთვისთვის `images/` საქაღალდე
      ჩაწერადი უნდა იყოს — cPanel-ზე ჩვეულებრივ ისედაც ასეა)

## 11. ძველი ვერსიის გათიშვა (აუცილებელია!)

როცა cloud9 სრულად ამუშავდება, **GitHub Pages-ის ვერსია უნდა გაითიშოს**
(repo Settings → Pages → Disable), თორემ ორი ჯავშნის სისტემა ორ სხვადასხვა
ბაზაში ჩაწერს. Supabase-ის პროექტი შეგიძლია კიდევ 1-2 კვირა შეინახო
სარეზერვოდ და მერე წაშალო.
