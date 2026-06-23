# Dental Clinic GT — Website

A modern, minimal, **bilingual (Georgian / English)** one-page website for a dental clinic.
Colors: light blue · white · gold. No build step, no frameworks — just open it in a browser.

---

## 📂 Files

| File | What it is (plain language) |
|------|------------------------------|
| `index.html` | The page itself — all the sections and content |
| `styles.css` | The design — colors, layout, fonts, mobile version |
| `script.js` | The behavior — language switch, menu, form, animations |
| `README.md` | This guide |

---

## ▶️ How to view it

**Easiest:** double-click `index.html` — it opens in your web browser.

**Recommended (for the contact form and fonts to behave exactly like the live site),**
run a tiny local server from this folder:

```bash
# Python (already on most computers)
python -m http.server 8000
```

Then open: <http://localhost:8000>

---

## ✏️ How to change the text

All text lives in **two languages** inside `script.js`, near the top, in the `I18N` object:

```js
ka: { hero_title: 'თქვენი ღიმილი ...', ... }   // Georgian
en: { hero_title: 'Your smile ...', ... }        // English
```

Find the key, change the value for **both** `ka` and `en`. That's it.

### Real info already filled in (from the clinic's public listings)
- **Phone:** `+995 599 06 11 19`
- **Email:** `DentalClinicGT@gmail.com`
- **Address:** Navtlughi St 5/7, near Isani Metro, Tbilisi
- **Facebook:** https://www.facebook.com/YourDentalClinicGT/ · **Instagram:** dental_gt_

> ⚠️ **Please double-check these.** They were gathered from web search because the
> Facebook page could not be read directly. Confirm the phone, email and exact address.

### Still placeholders — replace when ready
- **Working hours** (`contact_hours` in `script.js`) — currently an assumption: Mon–Fri 09:00–20:00, Sat 10:00–16:00. Update to the real schedule (also in the JSON-LD block in `index.html`).
- **Doctor names** — in `index.html`, the `team-card` sections
- **Reviews** — keys `review1_text` … `review3_meta` in `script.js`
- **FAQ answers** — keys `faq_q1`/`faq_a1` … in `script.js`
- **Photos** — see below

---

## 🖼️ Photos

The hero and "Why us" sections now show **real professional photos**, stored in the
`images/` folder (`hero.jpg`, `about.jpg`). These are free Pexels stock photos
(Pexels License — free for commercial use, no attribution required), used as
high-quality placeholders.

**To swap in your own clinic photos:** simply replace `images/hero.jpg` and
`images/about.jpg` with your own files of the same names (keep them roughly the same
shape — hero is portrait ~800×880, about is landscape ~1000×850). Nothing else to change.

If a photo ever fails to load, the site automatically falls back to an elegant
gradient illustration — it will never show a broken image.

Tip: save photos as `.jpg`, around 1000–1200px wide, to keep the page fast.

---

## 📅 Online booking system (Fresha-style)

Booking lives on its **own dedicated page** — `booking.html` (the "Book online" buttons
across the site open it). There a visitor chooses a service → a doctor → a day → sees
free/busy time slots (busy ones show the procedure) → picks a free time → enters details
→ confirms.

There is also an **admin panel** — `admin.html` — for the clinic (see next section).

Both pages share one data layer (`data.js`), so a booking made on `booking.html` shows up
in the admin schedule, and a manual entry in admin blocks that slot for online visitors.

> 💡 **For the demo, open the site through a local server** (so booking + admin share data):
> run `python -m http.server 8000` in this folder, then open
> <http://localhost:8000/index.html>. (Double-clicking the files also works, but the two
> pages may not share data until the live database is connected.)

It is built in three phases:

- **Phase 1 — done (now):** booking page + admin panel run on a **sample schedule** stored
  in the browser, so you can try the whole flow. A note on each page says so.
- **Phase 2 — make it live (needs your free Supabase account):** connect a real online
  database so availability is live and a booked slot instantly closes for everyone.
- **Phase 3 — polish admin:** real staff login (Supabase Auth) replacing the demo passcode.

## 🛠️ Admin panel — `admin.html`

The private page where the clinic runs day-to-day. Open `admin.html` and sign in.

> **Demo passcode: `admin`** (this is a placeholder gate for Phase 1 — real, secure staff
> login is added in Phase 2 with Supabase).

What it does:
- **Schedule** — pick a date and see every doctor's bookings: time, duration, procedure,
  patient name + phone, and the channel (online / phone / messenger / walk-in). Cancel with ✕.
- **Add booking** — enter a booking that came in by **phone or messenger** (doctor, service,
  date, free time, patient, channel). It instantly blocks that slot for online visitors.
- **Doctors** — add/remove doctors, toggle active, set which services they do.
- **Services** — edit durations, add services, toggle active.
- **Hours** — set opening/closing times, Saturday hours, slot interval and working days.
- **Prices** — edit each procedure's price range (from–to GEL), toggle active, add/remove items.

## 💰 Prices & estimator

The homepage has a **Prices** section (`pricing.js`) with a transparent estimator: visitors
tick the procedures they need and instantly see an estimated total range, a ~12-month
installment figure, and can **print a quote** (only the estimate prints).

> ⚠️ The price ranges are **indicative placeholders based on the Tbilisi market** (e.g.
> implant 1500–3000₾, crown 350–900₾, whitening 300–600₾). **Please set your real prices**
> in the admin **Prices** tab (or edit `DEFAULT_PRICES` in `data.js`).

### What I need from you for Phase 2 (≈5 minutes)
1. Go to <https://supabase.com> → **Start your project** → sign up (free).
2. Create a new project (pick any name + a database password; keep the password safe).
3. Open **Project Settings → API** and copy two values:
   - **Project URL**
   - **anon public** key  *(this one is safe to put in the website)*
4. Send me those two values. I will plug them in and run `supabase/schema.sql`
   (already prepared in this project) to set up the database.

> 🔒 Never share the **service_role** secret key. Only the *anon public* key goes in the site.

It can run at **$0/month** on Supabase's free tier + free static hosting.

---

## 🚀 Putting it online (free options)

This is a plain static site, so it can be hosted anywhere:
- **Netlify** — drag this folder onto <https://app.netlify.com/drop>
- **GitHub Pages**, **Vercel**, **Cloudflare Pages** — all work the same way

### Security headers (for whoever deploys it)
The page sets a Content-Security-Policy via a `<meta>` tag. For full protection, also set
these HTTP response headers at the host/server level:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## ♿ Built-in quality
- Works on phone, tablet and desktop
- Keyboard accessible, screen-reader labels, "skip to content" link
- Respects "reduce motion" system setting
- Georgian-supporting fonts (Noto Sans Georgian + Inter)
