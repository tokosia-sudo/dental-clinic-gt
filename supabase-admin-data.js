/* ============================================================
   Dental Clinic GT — Live ADMIN data layer (Supabase-backed)

   Exposes the same window.ClinicData interface the admin panel uses,
   backed by the real online database. Requires a signed-in staff
   member (Supabase Auth) — call load() after sign-in.

   Reading patient details and all management operations run as the
   "authenticated" role, allowed by Row Level Security.
   ============================================================ */
'use strict';

window.ClinicData = (function () {
  const STEP_MIN = 30;
  const TZ = (window.SUPABASE && window.SUPABASE.tzOffsetMinutes) || 240; // Tbilisi = UTC+4

  let services = [];
  let doctors = [];
  let hours = { openMin: 600, closeMin: 1080, satCloseMin: 960, stepMin: STEP_MIN, days: [1, 2, 3, 4, 5, 6] };
  let appts = [];

  /* ---------- time helpers (clinic-local / Tbilisi) ---------- */
  function pad(n) { return String(n).padStart(2, '0'); }
  function toMin(hhmm) { const p = hhmm.split(':').map(Number); return p[0] * 60 + p[1]; }
  function toHHMM(min) { return pad(Math.floor(min / 60)) + ':' + pad(min % 60); }
  function offsetStr() { const s = TZ >= 0 ? '+' : '-'; const a = Math.abs(TZ); return s + pad(Math.floor(a / 60)) + ':' + pad(a % 60); }
  function tbParts(instant) { const sh = new Date(instant.getTime() + TZ * 60000); return { y: sh.getUTCFullYear(), mo: sh.getUTCMonth(), d: sh.getUTCDate(), h: sh.getUTCHours(), mi: sh.getUTCMinutes() }; }
  function isoToday() { const p = tbParts(new Date()); return p.y + '-' + pad(p.mo + 1) + '-' + pad(p.d); }
  function nowMinTb() { const p = tbParts(new Date()); return p.h * 60 + p.mi; }
  function weekdayOf(iso) { return new Date(iso + 'T00:00:00').getDay(); }
  function closeForDate(iso) { return weekdayOf(iso) === 6 ? (hours.satCloseMin || hours.closeMin) : hours.closeMin; }
  function isOpen(iso) { return hours.days.indexOf(weekdayOf(iso)) !== -1; }
  function isPast(iso, startMin) { const today = isoToday(); if (iso < today) return true; if (iso > today) return false; return startMin <= nowMinTb(); }
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
        out.push(ov ? { time: time, status: 'busy', doctorId: doctorId, procedureKey: null } : { time: time, status: 'free', doctorId: doctorId });
      }
    }
    return out;
  }

  /* ---------- row mappers ---------- */
  function mapService(s) {
    return { id: s.id, name_ka: s.name_ka, name_en: s.name_en, dur: s.duration_min, nameKey: null,
      priceFrom: (s.price_from != null ? s.price_from : undefined), priceTo: (s.price_to != null ? s.price_to : undefined),
      active: s.active, sort: s.sort };
  }
  function mapAppt(a) {
    const tb = instantToTb(a.starts_at);
    return { id: a.id, doctorId: a.doctor_id, serviceId: a.service_id, dateISO: tb.dateISO, time: tb.time,
      durationMin: Math.round((new Date(a.ends_at) - new Date(a.starts_at)) / 60000),
      patientName: a.patient_name, patientPhone: a.patient_phone, patientEmail: a.patient_email,
      note: a.note, channel: a.channel || 'online', status: a.status };
  }

  /* ---------- load everything (after sign-in) ---------- */
  async function load() {
    const r = await Promise.all([
      window.SB.select('services?select=*&order=sort'),
      window.SB.select('doctors?select=*&order=sort'),
      window.SB.select('doctor_services?select=*'),
      window.SB.select('working_hours?select=*'),
      window.SB.select('appointments?select=*&order=starts_at'),
    ]);
    const svcRows = r[0], docRows = r[1], docSvc = r[2], hourRows = r[3], apptRows = r[4];

    services = svcRows.map(mapService);

    const byDoc = {};
    docSvc.forEach(function (x) { (byDoc[x.doctor_id] = byDoc[x.doctor_id] || []).push(x.service_id); });
    doctors = docRows.map(function (d) {
      return { id: d.id, slug: d.slug, name: d.name, role_ka: d.role_ka, role_en: d.role_en, roleKey: '', services: byDoc[d.id] || [], active: d.active, sort: d.sort };
    });

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

    appts = apptRows.map(mapAppt);
  }

  /* ---------- appointments ---------- */
  function listAppointments(filter) {
    filter = filter || {};
    return appts
      .filter(function (a) { return a.status !== 'cancelled'; })
      .filter(function (a) { return filter.dateISO ? a.dateISO === filter.dateISO : true; })
      .filter(function (a) { return filter.doctorId ? a.doctorId === filter.doctorId : true; })
      .sort(function (a, b) { return a.dateISO === b.dateISO ? (a.time < b.time ? -1 : 1) : (a.dateISO < b.dateISO ? -1 : 1); });
  }

  async function createAppointment(payload) {
    const dur = svcDur(payload.serviceId);
    const startMin = toMin(payload.time);
    if (!doctor(payload.doctorId) || !svc(payload.serviceId)) return { ok: false, reason: 'invalid' };
    if (!payload.patientName || payload.patientName.trim().length < 2) return { ok: false, reason: 'name' };
    if (!/^\+?[0-9\s\-()]{6,20}$/.test(payload.patientPhone || '')) return { ok: false, reason: 'phone' };
    if (isPast(payload.dateISO, startMin)) return { ok: false, reason: 'past' };
    if (overlapping(startMin, dur, apptsFor(payload.doctorId, payload.dateISO))) return { ok: false, reason: 'taken' };
    const startsISO = tbToInstantISO(payload.dateISO, payload.time);
    const endsISO = new Date(new Date(startsISO).getTime() + dur * 60000).toISOString();
    try {
      const rows = await window.SB.write('POST', 'appointments?select=*', {
        doctor_id: payload.doctorId, service_id: payload.serviceId,
        starts_at: startsISO, ends_at: endsISO,
        patient_name: payload.patientName.trim(), patient_phone: (payload.patientPhone || '').trim(),
        patient_email: (payload.patientEmail || '').trim() || null, note: (payload.note || '').trim() || null,
        channel: payload.channel || 'online', status: 'booked',
      }, 'return=representation');
      const row = Array.isArray(rows) ? rows[0] : rows;
      if (row) appts.push(mapAppt(row));
      return { ok: true, id: row && row.id };
    } catch (err) {
      const msg = (err && err.body && (err.body.message || err.body.hint)) || '';
      if ((err && err.status === 409) || /duplicate|unique|already/i.test(msg)) return { ok: false, reason: 'taken' };
      return { ok: false, reason: 'error' };
    }
  }

  async function cancelAppointment(id) {
    try {
      await window.SB.write('PATCH', 'appointments?id=eq.' + encodeURIComponent(id), { status: 'cancelled' });
      const a = appts.find(function (x) { return String(x.id) === String(id); });
      if (a) a.status = 'cancelled';
      return true;
    } catch (e) { return false; }
  }

  /* ---------- doctors ---------- */
  async function upsertDoctor(d) {
    const existing = d.id ? doctor(d.id) : null;
    if (existing) {
      const patch = {};
      if (d.name != null) patch.name = d.name;
      if (d.active != null) patch.active = d.active;
      if (d.role_ka != null) patch.role_ka = d.role_ka;
      if (d.role_en != null) patch.role_en = d.role_en;
      if (Object.keys(patch).length) await window.SB.write('PATCH', 'doctors?id=eq.' + encodeURIComponent(d.id), patch);
      if (patch.name != null) existing.name = patch.name;
      if (patch.active != null) existing.active = patch.active;
      if (patch.role_ka != null) existing.role_ka = patch.role_ka;
      if (patch.role_en != null) existing.role_en = patch.role_en;
      if (d.services) {
        await window.SB.write('DELETE', 'doctor_services?doctor_id=eq.' + encodeURIComponent(d.id));
        if (d.services.length) await window.SB.write('POST', 'doctor_services', d.services.map(function (sid) { return { doctor_id: d.id, service_id: sid }; }));
        existing.services = d.services.slice();
      }
      return existing.id;
    }
    const slug = 'doc-' + Date.now();
    const rows = await window.SB.write('POST', 'doctors?select=*', {
      slug: slug, name: (d.name || '').trim(), role_ka: d.role_ka || null, role_en: d.role_en || null,
      active: d.active !== false, sort: doctors.length + 1,
    }, 'return=representation');
    const row = Array.isArray(rows) ? rows[0] : rows;
    const svcs = d.services || [];
    if (svcs.length) await window.SB.write('POST', 'doctor_services', svcs.map(function (sid) { return { doctor_id: row.id, service_id: sid }; }));
    doctors.push({ id: row.id, slug: row.slug, name: row.name, role_ka: row.role_ka, role_en: row.role_en, roleKey: '', services: svcs.slice(), active: row.active, sort: row.sort });
    return row.id;
  }

  async function removeDoctor(id) {
    try {
      await window.SB.write('DELETE', 'doctors?id=eq.' + encodeURIComponent(id));
      doctors = doctors.filter(function (d) { return d.id !== id; });
      appts = appts.filter(function (a) { return a.doctorId !== id; });
      return true;
    } catch (e) { return false; }
  }

  /* ---------- services ---------- */
  async function upsertService(s) {
    const existing = s.id ? svc(s.id) : null;
    if (existing) {
      const patch = {};
      if (s.dur != null) patch.duration_min = s.dur;
      if (s.priceFrom != null) patch.price_from = s.priceFrom;
      if (s.priceTo != null) patch.price_to = s.priceTo;
      if (s.active != null) patch.active = s.active;
      if (s.name_ka != null) patch.name_ka = s.name_ka;
      if (s.name_en != null) patch.name_en = s.name_en;
      if (Object.keys(patch).length) await window.SB.write('PATCH', 'services?id=eq.' + encodeURIComponent(s.id), patch);
      if (s.dur != null) existing.dur = s.dur;
      if (s.priceFrom != null) existing.priceFrom = s.priceFrom;
      if (s.priceTo != null) existing.priceTo = s.priceTo;
      if (s.active != null) existing.active = s.active;
      if (s.name_ka != null) existing.name_ka = s.name_ka;
      if (s.name_en != null) existing.name_en = s.name_en;
      return existing.id;
    }
    const id = s.id || ('svc-' + Date.now());
    const row0 = { id: id, name_ka: (s.name_ka || '').trim() || id, name_en: (s.name_en || '').trim() || id,
      duration_min: s.dur || 30, price_from: (s.priceFrom != null ? s.priceFrom : null), price_to: (s.priceTo != null ? s.priceTo : null),
      active: s.active !== false, sort: services.length + 1 };
    await window.SB.write('POST', 'services', row0);
    services.push(mapService(row0));
    return id;
  }

  /* ---------- hours (global → per-doctor rows) ---------- */
  async function setHours(h) {
    hours = Object.assign({}, hours, h);
    const active = doctors.filter(function (d) { return d.active; });
    for (let i = 0; i < active.length; i++) {
      const doc = active[i];
      await window.SB.write('DELETE', 'working_hours?doctor_id=eq.' + encodeURIComponent(doc.id));
      const rows = hours.days.map(function (wd) { return { doctor_id: doc.id, weekday: wd, start_min: hours.openMin, end_min: (wd === 6 ? hours.satCloseMin : hours.closeMin) }; });
      if (rows.length) await window.SB.write('POST', 'working_hours', rows);
    }
  }

  /* ---------- public API (matches the admin panel) ---------- */
  return {
    load: load,
    getServices: function () { return services.filter(function (s) { return s.active; }); },
    getAllServices: function () { return services.slice(); },
    getDoctors: function () { return doctors.filter(function (d) { return d.active; }); },
    getAllDoctors: function () { return doctors.slice(); },
    getDoctor: doctor,
    getDoctorsForService: doctorsForService,
    getHours: function () { return Object.assign({}, hours); },
    getSlots: getSlots,
    listAppointments: listAppointments,
    createAppointment: createAppointment,
    cancelAppointment: cancelAppointment,
    upsertDoctor: upsertDoctor,
    removeDoctor: removeDoctor,
    upsertService: upsertService,
    setHours: setHours,
    toHHMM: toHHMM,
    toMin: toMin,
  };
})();
