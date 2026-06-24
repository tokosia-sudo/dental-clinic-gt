/* ============================================================
   Dental Clinic GT — Live data layer (Supabase-backed)

   Drop-in replacement for the booking page's data source. It exposes
   the SAME window.ClinicData interface the booking widget already uses,
   but reads/writes the real online database instead of this browser.

   Reads (anon, read-only): services, doctors, doctor_services,
   working_hours, busy_slots (availability — no patient details).
   Writes: the book_appointment() function, which validates the request
   server-side. A UNIQUE(doctor_id, starts_at) constraint guarantees the
   same slot can never be booked twice, even by two people at once.
   ============================================================ */
'use strict';

window.ClinicData = (function () {
  const STEP_MIN = 30; // slot interval in minutes (the time grid)
  const TZ = (window.SUPABASE && window.SUPABASE.tzOffsetMinutes) || 240; // Tbilisi = UTC+4

  let services = [];
  let doctors = [];
  let hours = { openMin: 600, closeMin: 1080, satCloseMin: 960, stepMin: STEP_MIN, days: [1, 2, 3, 4, 5, 6] };
  let appts = [];

  /* ---------- time helpers (all in clinic-local / Tbilisi time) ---------- */
  function pad(n) { return String(n).padStart(2, '0'); }
  function toMin(hhmm) { const p = hhmm.split(':').map(Number); return p[0] * 60 + p[1]; }
  function toHHMM(min) { return pad(Math.floor(min / 60)) + ':' + pad(min % 60); }
  function offsetStr() { const s = TZ >= 0 ? '+' : '-'; const a = Math.abs(TZ); return s + pad(Math.floor(a / 60)) + ':' + pad(a % 60); }
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
  function instantToTb(iso) { const p = tbParts(new Date(iso)); return { dateISO: p.y + '-' + pad(p.mo + 1) + '-' + pad(p.d), time: pad(p.h) + ':' + pad(p.mi) }; }
  function tbToInstantISO(dateISO, time) { return dateISO + 'T' + time + ':00' + offsetStr(); }

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

  /* ---------- slots (same rules as the sample data layer) ---------- */
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
      const id = await window.SB.rpc('book_appointment', {
        p_doctor: payload.doctorId,
        p_service: payload.serviceId,
        p_starts: tbToInstantISO(payload.dateISO, payload.time),
        p_name: payload.patientName.trim(),
        p_phone: (payload.patientPhone || '').trim(),
        p_email: (payload.patientEmail || '').trim() || null,
        p_note: (payload.note || '').trim() || null,
      });
      // Reflect locally so the chosen slot immediately shows as busy.
      appts.push({ doctorId: payload.doctorId, serviceId: payload.serviceId, dateISO: payload.dateISO, time: payload.time, durationMin: dur, status: 'booked' });
      return { ok: true, id: id };
    } catch (err) {
      const msg = (err && err.body && (err.body.message || err.body.hint)) || '';
      if ((err && err.status === 409) || /duplicate|unique|already|slot/i.test(msg)) return { ok: false, reason: 'taken' };
      return { ok: false, reason: 'error' };
    }
  }

  /* ---------- load everything once, then mark ready ---------- */
  let resolveReady;
  const ready = new Promise(function (r) { resolveReady = r; });

  async function load() {
    const r = await Promise.all([
      window.SB.select('services?select=*&order=sort'),
      window.SB.select('doctors?select=*&active=eq.true&order=sort'),
      window.SB.select('doctor_services?select=*'),
      window.SB.select('working_hours?select=*'),
      window.SB.select('busy_slots?select=*'),
    ]);
    const svcRows = r[0], docRows = r[1], docSvc = r[2], hourRows = r[3], busy = r[4];

    services = svcRows.map(function (s) {
      return {
        id: s.id, name_ka: s.name_ka, name_en: s.name_en, dur: s.duration_min,
        priceFrom: (s.price_from != null ? s.price_from : undefined),
        priceTo: (s.price_to != null ? s.price_to : undefined),
        active: s.active, sort: s.sort,
      };
    }).filter(function (s) { return s.active; });

    const byDoc = {};
    docSvc.forEach(function (x) { (byDoc[x.doctor_id] = byDoc[x.doctor_id] || []).push(x.service_id); });
    doctors = docRows.map(function (d) { return { id: d.id, name: d.name, services: byDoc[d.id] || [], active: d.active }; });

    if (hourRows.length) {
      const days = [];
      hourRows.forEach(function (h) { if (days.indexOf(h.weekday) === -1) days.push(h.weekday); });
      days.sort(function (a, b) { return a - b; });
      const wk = hourRows.filter(function (h) { return h.weekday >= 1 && h.weekday <= 5; });
      const sat = hourRows.filter(function (h) { return h.weekday === 6; });
      const openMin = Math.min.apply(null, hourRows.map(function (h) { return h.start_min; }));
      const closeMin = (wk.length ? Math.max.apply(null, wk.map(function (h) { return h.end_min; })) : Math.max.apply(null, hourRows.map(function (h) { return h.end_min; })));
      const satCloseMin = (sat.length ? Math.max.apply(null, sat.map(function (h) { return h.end_min; })) : closeMin);
      hours = { openMin: openMin, closeMin: closeMin, satCloseMin: satCloseMin, stepMin: STEP_MIN, days: days };
    }

    appts = busy.map(function (b) {
      const tb = instantToTb(b.starts_at);
      const durMin = Math.round((new Date(b.ends_at) - new Date(b.starts_at)) / 60000);
      return { doctorId: b.doctor_id, serviceId: b.service_id, dateISO: tb.dateISO, time: tb.time, durationMin: durMin, status: 'booked' };
    });
  }

  load().then(function () { resolveReady(true); }).catch(function (err) {
    if (window.console && console.error) console.error('Supabase load failed:', err);
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
