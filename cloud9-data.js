/* ============================================================
   Dental Clinic GT — Live data layer (cloud9 PHP/MySQL backend)

   Drop-in replacement for supabase-data.js: exposes the SAME
   window.ClinicData interface the booking widget uses, but talks
   to our own API (api/public.php + api/book.php) on this server.
   To activate: in booking.html load THIS file instead of
   supabase-config.js + supabase-data.js.
   ============================================================ */
'use strict';

window.ClinicData = (function () {
  const STEP_MIN = 30;
  const TZ = 240; // Tbilisi = UTC+4, no daylight saving
  const API = 'api/';

  let services = [];
  let doctors = [];
  let hours = { openMin: 600, closeMin: 1080, satCloseMin: 960, stepMin: STEP_MIN, days: [1, 2, 3, 4, 5, 6] };
  let appts = [];

  /* ---------- time helpers (all clinic-local / Tbilisi) ---------- */
  function pad(n) { return String(n).padStart(2, '0'); }
  function toMin(hhmm) { const p = hhmm.split(':').map(Number); return p[0] * 60 + p[1]; }
  function toHHMM(min) { return pad(Math.floor(min / 60)) + ':' + pad(min % 60); }
  function tbParts(instant) {
    const sh = new Date(instant.getTime() + TZ * 60000);
    return { y: sh.getUTCFullYear(), mo: sh.getUTCMonth(), d: sh.getUTCDate(), h: sh.getUTCHours(), mi: sh.getUTCMinutes() };
  }
  function isoToday() { const p = tbParts(new Date()); return p.y + '-' + pad(p.mo + 1) + '-' + pad(p.d); }
  function nowMinTb() { const p = tbParts(new Date()); return p.h * 60 + p.mi; }
  function weekdayOf(iso) { return new Date(iso + 'T00:00:00').getDay(); }
  function closeForDate(iso) { return weekdayOf(iso) === 6 ? (hours.satCloseMin || hours.closeMin) : hours.closeMin; }
  function isOpen(iso) { return hours.days.indexOf(weekdayOf(iso)) !== -1; }
  function isPast(iso, startMin) {
    const today = isoToday();
    if (iso < today) return true;
    if (iso > today) return false;
    return startMin <= nowMinTb();
  }

  /* ---------- lookups ---------- */
  function svc(id) { return services.find(function (s) { return s.id === id; }); }
  function svcDur(id) { const s = svc(id); return s ? s.dur : 30; }
  function doctor(id) { return doctors.find(function (d) { return d.id === id; }); }
  function doctorsForService(serviceId) { return doctors.filter(function (d) { return d.active && d.services.indexOf(serviceId) !== -1; }); }
  function apptsFor(doctorId, dateISO) { return appts.filter(function (a) { return a.doctorId === doctorId && a.dateISO === dateISO && a.status !== 'cancelled'; }); }
  function overlapping(startMin, dur, list) {
    const end = startMin + dur;
    return list.find(function (a) { const as = toMin(a.time); const ae = as + (a.durationMin || svcDur(a.serviceId)); return startMin < ae && as < end; });
  }

  /* ---------- slots ---------- */
  function getSlots(serviceId, doctorId, dateISO) {
    const dur = svcDur(serviceId);
    const open = hours.openMin, close = closeForDate(dateISO), step = hours.stepMin;
    const out = [];
    for (let t = open; t + step <= close; t += step) {
      const time = toHHMM(t);
      if (!isOpen(dateISO)) { out.push({ time: time, status: 'closed' }); continue; }
      if (isPast(dateISO, t) || t + dur > close) { out.push({ time: time, status: 'past' }); continue; }
      if (doctorId === 'any') {
        const docs = doctorsForService(serviceId);
        const freeDoc = docs.find(function (d) { return !overlapping(t, dur, apptsFor(d.id, dateISO)); });
        out.push(freeDoc ? { time: time, status: 'free', doctorId: freeDoc.id } : { time: time, status: 'busy' });
      } else {
        const ov = overlapping(t, dur, apptsFor(doctorId, dateISO));
        out.push(ov ? { time: time, status: 'busy', doctorId: doctorId } : { time: time, status: 'free', doctorId: doctorId });
      }
    }
    return out;
  }

  /* ---------- create (online booking) ---------- */
  async function createAppointment(payload) {
    const dur = svcDur(payload.serviceId);
    const startMin = toMin(payload.time);
    if (!doctor(payload.doctorId) || !svc(payload.serviceId)) return { ok: false, reason: 'invalid' };
    if (!payload.patientName || payload.patientName.trim().length < 2) return { ok: false, reason: 'name' };
    if (!/^\+?[0-9\s\-()]{6,20}$/.test(payload.patientPhone || '')) return { ok: false, reason: 'phone' };
    if (isPast(payload.dateISO, startMin)) return { ok: false, reason: 'past' };
    if (overlapping(startMin, dur, apptsFor(payload.doctorId, payload.dateISO))) return { ok: false, reason: 'taken' };
    try {
      const res = await fetch(API + 'book.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: payload.doctorId, serviceId: payload.serviceId,
          dateISO: payload.dateISO, time: payload.time,
          patientName: payload.patientName.trim(),
          patientPhone: (payload.patientPhone || '').trim(),
          patientEmail: (payload.patientEmail || '').trim(),
          note: (payload.note || '').trim(),
        }),
      });
      const data = await res.json().catch(function () { return null; });
      if (res.ok && data && data.ok) {
        appts.push({ doctorId: payload.doctorId, serviceId: payload.serviceId, dateISO: payload.dateISO, time: payload.time, durationMin: dur, status: 'booked' });
        return { ok: true, id: data.id };
      }
      if (res.status === 409 || (data && data.reason === 'taken')) return { ok: false, reason: 'taken' };
      return { ok: false, reason: (data && data.reason) || 'error' };
    } catch (err) {
      return { ok: false, reason: 'error' };
    }
  }

  /* ---------- load everything once, then mark ready ---------- */
  let resolveReady;
  const ready = new Promise(function (r) { resolveReady = r; });

  async function load() {
    const r = await Promise.all([
      fetch(API + 'public.php?what=catalog').then(function (x) { if (!x.ok) throw new Error('catalog ' + x.status); return x.json(); }),
      fetch(API + 'public.php?what=busy').then(function (x) { if (!x.ok) throw new Error('busy ' + x.status); return x.json(); }),
    ]);
    const cat = r[0];
    services = (cat.services || []).filter(function (s) { return s.active; });
    doctors = cat.doctors || [];
    if (cat.hours) hours = Object.assign({ stepMin: STEP_MIN }, cat.hours);
    appts = (r[1] || []).map(function (b) { return Object.assign({ status: 'booked' }, b); });
  }

  load().then(function () { resolveReady(true); }).catch(function (err) {
    if (window.console && console.error) console.error('API load failed:', err);
    resolveReady(false);
  });

  /* ---------- public API (same shape the booking widget expects) ---------- */
  return {
    ready: ready,
    getServices: function () { return services.filter(function (s) { return s.active; }); },
    getAllServices: function () { return services.slice(); },
    getDoctors: function () { return doctors.filter(function (d) { return d.active; }); },
    getAllDoctors: function () { return doctors.slice(); },
    getDoctor: doctor,
    getDoctorsForService: doctorsForService,
    getHours: function () { return Object.assign({}, hours); },
    getSlots: getSlots,
    createAppointment: createAppointment,
    toHHMM: toHHMM,
    toMin: toMin,
  };
})();
