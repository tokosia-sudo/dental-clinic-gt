/* ============================================================
   Dental Clinic GT — Shared data store (ClinicData)
   Single source of truth used by BOTH the booking page and the admin panel.

   PHASE 1 (now): backed by the browser's localStorage so you can try the full
   flow (book online + manage in admin). Tip: run via a local server
   (python -m http.server) so booking + admin share the same data.

   PHASE 2 (next): replace the read/write functions at the bottom with Supabase
   calls. The rest of the app keeps working unchanged.
   ============================================================ */
'use strict';

window.ClinicData = (function () {
  const KEYS = { services: 'dcgt_services', doctors: 'dcgt_doctors', hours: 'dcgt_hours', appts: 'dcgt_appts', seed: 'dcgt_seed_v' };
  const SEED_VERSION = 1;

  // priceFrom/priceTo in GEL — indicative ranges (Tbilisi market); the clinic edits them in admin → Services.
  const DEFAULT_SERVICES = [
    { id: 'general',   nameKey: 'srv1_title', name_ka: 'ზოგადი სტომატოლოგია',     name_en: 'General dentistry',     dur: 30, priceFrom: 50,   priceTo: 450,  active: true },
    { id: 'implants',  nameKey: 'srv2_title', name_ka: 'იმპლანტაცია',             name_en: 'Dental implants',       dur: 60, priceFrom: 1500, priceTo: 3000, active: true },
    { id: 'ortho',     nameKey: 'srv3_title', name_ka: 'ორთოდონტია',              name_en: 'Orthodontics',          dur: 45, priceFrom: 2000, priceTo: 7000, active: true },
    { id: 'cosmetic',  nameKey: 'srv4_title', name_ka: 'ესთეტიკა და გათეთრება',   name_en: 'Cosmetic & whitening',  dur: 45, priceFrom: 300,  priceTo: 1200, active: true },
    { id: 'pediatric', nameKey: 'srv5_title', name_ka: 'ბავშვთა სტომატოლოგია',    name_en: 'Pediatric dentistry',   dur: 30, priceFrom: 50,   priceTo: 150,  active: true },
    { id: 'surgery',   nameKey: 'srv6_title', name_ka: 'ქირურგია და პროთეზირება', name_en: 'Surgery & prosthetics', dur: 60, priceFrom: 60,   priceTo: 1500, active: true },
  ];

  const DEFAULT_DOCTORS = [
    { id: 'nino',   name: 'Dr. Nino Beridze',     roleKey: 'team_role_1', services: ['general', 'cosmetic', 'pediatric'], active: true },
    { id: 'giorgi', name: 'Dr. Giorgi Kapanadze', roleKey: 'team_role_2', services: ['implants', 'surgery'],              active: true },
    { id: 'ana',    name: 'Dr. Ana Tsiklauri',    roleKey: 'team_role_3', services: ['ortho', 'cosmetic'],                active: true },
    { id: 'luka',   name: 'Dr. Luka Maisuradze',  roleKey: 'team_role_4', services: ['pediatric', 'general'],             active: true },
  ];

  // weekday: 0=Sun .. 6=Sat. Default: Mon–Fri 10–18, Sat 10–16.
  const DEFAULT_HOURS = { openMin: 600, closeMin: 1080, stepMin: 30, days: [1, 2, 3, 4, 5, 6], satCloseMin: 960 };

  /* ---------- storage helpers ---------- */
  function read(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function write(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* ignore */ } }

  /* ---------- in-memory state ---------- */
  let services = read(KEYS.services, null) || DEFAULT_SERVICES.slice();
  let doctors = read(KEYS.doctors, null) || DEFAULT_DOCTORS.slice();
  let hours = read(KEYS.hours, null) || Object.assign({}, DEFAULT_HOURS);
  let appts = read(KEYS.appts, null) || [];

  // Migration: older cached services had no price fields — backfill them from defaults.
  (function migrateServicePrices() {
    let changed = false;
    services.forEach((s) => {
      if (s.priceFrom === undefined || s.priceTo === undefined) {
        const d = DEFAULT_SERVICES.find((x) => x.id === s.id);
        s.priceFrom = d ? d.priceFrom : 0; s.priceTo = d ? d.priceTo : 0; changed = true;
      }
    });
    if (changed) write(KEYS.services, services);
  })();

  function persistAll() { write(KEYS.services, services); write(KEYS.doctors, doctors); write(KEYS.hours, hours); write(KEYS.appts, appts); }

  /* ---------- time helpers ---------- */
  function pad(n) { return String(n).padStart(2, '0'); }
  function toMin(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; }
  function toHHMM(min) { return pad(Math.floor(min / 60)) + ':' + pad(min % 60); }
  function isoToday() { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function weekdayOf(dateISO) { return new Date(dateISO + 'T00:00:00').getDay(); }
  function closeForDate(dateISO) { return weekdayOf(dateISO) === 6 ? (hours.satCloseMin || hours.closeMin) : hours.closeMin; }
  function isOpen(dateISO) { return hours.days.includes(weekdayOf(dateISO)); }
  function isPast(dateISO, startMin) {
    const now = new Date();
    const todayISO = isoToday();
    if (dateISO < todayISO) return true;
    if (dateISO > todayISO) return false;
    return startMin <= (now.getHours() * 60 + now.getMinutes());
  }

  function svc(id) { return services.find((s) => s.id === id); }
  function svcDur(id) { const s = svc(id); return s ? s.dur : 30; }
  function svcNameKey(id) { const s = svc(id); return s ? s.nameKey : null; }
  function doctor(id) { return doctors.find((d) => d.id === id); }
  function doctorsForService(serviceId) { return doctors.filter((d) => d.active && d.services.includes(serviceId)); }

  function hashStr(str) { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; }

  /* ---------- appointments ---------- */
  function apptsFor(doctorId, dateISO) {
    return appts.filter((a) => a.doctorId === doctorId && a.dateISO === dateISO && a.status !== 'cancelled');
  }
  function overlapping(startMin, dur, list) {
    const end = startMin + dur;
    return list.find((a) => {
      const as = toMin(a.time); const ae = as + (a.durationMin || svcDur(a.serviceId));
      return startMin < ae && as < end;
    });
  }

  // Slots for a (service, doctor|'any', date). Each: {time, status, doctorId?, procedureKey?}
  // status: 'free' | 'busy' | 'past' | 'closed'
  function getSlots(serviceId, doctorId, dateISO) {
    const dur = svcDur(serviceId);
    const open = hours.openMin, close = closeForDate(dateISO), step = hours.stepMin;
    const out = [];
    for (let t = open; t + step <= close; t += step) {
      const time = toHHMM(t);
      if (!isOpen(dateISO)) { out.push({ time, status: 'closed' }); continue; }
      if (isPast(dateISO, t) || t + dur > close) { out.push({ time, status: 'past' }); continue; }
      if (doctorId === 'any') {
        const docs = doctorsForService(serviceId);
        const freeDoc = docs.find((d) => !overlapping(t, dur, apptsFor(d.id, dateISO)));
        out.push(freeDoc ? { time, status: 'free', doctorId: freeDoc.id } : { time, status: 'busy' });
      } else {
        const ov = overlapping(t, dur, apptsFor(doctorId, dateISO));
        out.push(ov ? { time, status: 'busy', doctorId, procedureKey: svcNameKey(ov.serviceId) }
          : { time, status: 'free', doctorId });
      }
    }
    return out;
  }

  // Create an appointment (online booking OR manual admin entry).
  // payload: {doctorId, serviceId, dateISO, time, patientName, patientPhone, patientEmail?, note?, channel?}
  function createAppointment(payload) {
    const dur = svcDur(payload.serviceId);
    const startMin = toMin(payload.time);
    if (!doctor(payload.doctorId) || !svc(payload.serviceId)) return { ok: false, reason: 'invalid' };
    if (!payload.patientName || payload.patientName.trim().length < 2) return { ok: false, reason: 'name' };
    if (!/^\+?[0-9\s\-()]{6,20}$/.test(payload.patientPhone || '')) return { ok: false, reason: 'phone' };
    if (isPast(payload.dateISO, startMin)) return { ok: false, reason: 'past' };
    if (overlapping(startMin, dur, apptsFor(payload.doctorId, payload.dateISO))) return { ok: false, reason: 'taken' };

    const appt = {
      id: 'a' + Date.now() + Math.floor(performance.now()),
      doctorId: payload.doctorId,
      serviceId: payload.serviceId,
      dateISO: payload.dateISO,
      time: payload.time,
      durationMin: dur,
      patientName: payload.patientName.trim(),
      patientPhone: (payload.patientPhone || '').trim(),
      patientEmail: (payload.patientEmail || '').trim() || null,
      note: (payload.note || '').trim() || null,
      channel: payload.channel || 'online',
      status: 'booked',
      createdAt: new Date().toISOString(),
    };
    appts.push(appt);
    write(KEYS.appts, appts);
    return { ok: true, id: appt.id };
  }

  function cancelAppointment(id) {
    const a = appts.find((x) => x.id === id);
    if (a) { a.status = 'cancelled'; write(KEYS.appts, appts); return true; }
    return false;
  }

  function listAppointments(filter) {
    filter = filter || {};
    return appts
      .filter((a) => a.status !== 'cancelled')
      .filter((a) => (filter.dateISO ? a.dateISO === filter.dateISO : true))
      .filter((a) => (filter.doctorId ? a.doctorId === filter.doctorId : true))
      .sort((a, b) => (a.time < b.time ? -1 : 1));
  }

  /* ---------- catalog management (admin) ---------- */
  function upsertDoctor(d) {
    const i = doctors.findIndex((x) => x.id === d.id);
    if (i >= 0) doctors[i] = Object.assign({}, doctors[i], d);
    else doctors.push(Object.assign({ active: true, services: [], roleKey: '' }, d));
    write(KEYS.doctors, doctors);
  }
  function removeDoctor(id) { doctors = doctors.filter((d) => d.id !== id); write(KEYS.doctors, doctors); }
  function upsertService(s) {
    const i = services.findIndex((x) => x.id === s.id);
    if (i >= 0) services[i] = Object.assign({}, services[i], s);
    else services.push(Object.assign({ active: true, dur: 30 }, s));
    write(KEYS.services, services);
  }
  function setHours(h) { hours = Object.assign({}, hours, h); write(KEYS.hours, hours); }

  /* ---------- demo seed ---------- */
  function seedDemo(force) {
    if (!force && read(KEYS.seed, 0) === SEED_VERSION && appts.length) return;
    const names = ['ნ. კ.', 'დ. ბ.', 'მ. ც.', 'გ. ლ.', 'ს. ნ.', 'თ. მ.', 'ი. ჯ.', 'ა. რ.', 'ლ. ხ.', 'ქ. ფ.'];
    const channels = ['online', 'phone', 'messenger'];
    const list = [];
    const base = new Date(); base.setHours(0, 0, 0, 0);
    for (let day = 0; day < 14; day++) {
      const d = new Date(base); d.setDate(base.getDate() + day);
      const dateISO = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
      if (!hours.days.includes(d.getDay())) continue;
      doctors.forEach((doc, di) => {
        const count = 1 + (hashStr(dateISO + doc.id) % 3); // 1..3 per day
        const used = [];
        for (let k = 0; k < count; k++) {
          const sId = doc.services[hashStr(dateISO + doc.id + k) % doc.services.length];
          const dur = svcDur(sId);
          const slots = [];
          for (let t = hours.openMin; t + dur <= closeForDate(dateISO); t += hours.stepMin) slots.push(t);
          const start = slots[hashStr(dateISO + doc.id + k + 's') % slots.length];
          if (used.some((u) => start < u.e && u.s < start + dur)) continue;
          used.push({ s: start, e: start + dur });
          list.push({
            id: 'seed-' + dateISO + '-' + doc.id + '-' + k,
            doctorId: doc.id, serviceId: sId, dateISO, time: toHHMM(start), durationMin: dur,
            patientName: names[hashStr(dateISO + doc.id + k + 'n') % names.length],
            patientPhone: '+995 5' + (10 + (hashStr(doc.id + k) % 89)) + ' ' + (100000 + hashStr(dateISO + k) % 899999),
            patientEmail: null, note: null,
            channel: channels[hashStr(dateISO + doc.id + k + 'c') % channels.length],
            status: 'booked', createdAt: new Date().toISOString(),
          });
        }
      });
    }
    appts = list;
    write(KEYS.appts, appts);
    write(KEYS.seed, SEED_VERSION);
  }
  seedDemo(false);

  /* ---------- public API ---------- */
  return {
    getServices: () => services.filter((s) => s.active),
    getAllServices: () => services.slice(),
    getDoctors: () => doctors.filter((d) => d.active),
    getAllDoctors: () => doctors.slice(),
    getDoctor: doctor,
    getDoctorsForService: doctorsForService,
    getHours: () => Object.assign({}, hours),
    getSlots,
    createAppointment,
    cancelAppointment,
    listAppointments,
    upsertDoctor, removeDoctor, upsertService, setHours,
    seedDemo,
    toHHMM, toMin,
    _keys: KEYS,
  };
})();
