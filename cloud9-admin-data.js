/* ============================================================
   Dental Clinic GT — Live ADMIN data layer (cloud9 PHP/MySQL)

   Drop-in replacement for supabase-config.js + supabase-admin-data.js:
   exposes the SAME window.SB (sign-in) and window.ClinicData
   interfaces admin.js already uses, but talks to our own API.
   To activate: in admin.html load THIS file instead of
   supabase-config.js + supabase-admin-data.js.
   ============================================================ */
'use strict';

/* ---------- sign-in shim (PHP session behind the scenes) ---------- */
window.SB = (function () {
  const FLAG = 'dcgt_php_authed';
  function isAuthed() { try { return localStorage.getItem(FLAG) === '1'; } catch (e) { return false; } }
  function setFlag(on) { try { on ? localStorage.setItem(FLAG, '1') : localStorage.removeItem(FLAG); } catch (e) {} }

  async function signIn(email, password) {
    const res = await fetch('api/admin/auth.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', email: email, password: password }),
    });
    const data = await res.json().catch(function () { return null; });
    if (!res.ok || !data || !data.ok) { const e = new Error('signIn -> ' + res.status); e.status = res.status; throw e; }
    setFlag(true);
    return data;
  }
  async function signOut() {
    try {
      await fetch('api/admin/auth.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
    } catch (e) {}
    setFlag(false);
  }
  return { signIn: signIn, signOut: signOut, isAuthed: isAuthed, setSession: setFlag, getSession: isAuthed };
})();

/* ---------- data layer ---------- */
window.ClinicData = (function () {
  const STEP_MIN = 30;
  const TZ = 240; // Tbilisi = UTC+4
  const API = 'api/';

  let services = [];
  let doctors = [];
  let hours = { openMin: 600, closeMin: 1080, satCloseMin: 960, stepMin: STEP_MIN, days: [1, 2, 3, 4, 5, 6] };
  let appts = [];

  /* ---------- time helpers ---------- */
  function pad(n) { return String(n).padStart(2, '0'); }
  function toMin(hhmm) { const p = hhmm.split(':').map(Number); return p[0] * 60 + p[1]; }
  function toHHMM(min) { return pad(Math.floor(min / 60)) + ':' + pad(min % 60); }
  function tbParts(instant) { const sh = new Date(instant.getTime() + TZ * 60000); return { y: sh.getUTCFullYear(), mo: sh.getUTCMonth(), d: sh.getUTCDate(), h: sh.getUTCHours(), mi: sh.getUTCMinutes() }; }
  function isoToday() { const p = tbParts(new Date()); return p.y + '-' + pad(p.mo + 1) + '-' + pad(p.d); }
  function nowMinTb() { const p = tbParts(new Date()); return p.h * 60 + p.mi; }
  function weekdayOf(iso) { return new Date(iso + 'T00:00:00').getDay(); }
  function closeForDate(iso) { return weekdayOf(iso) === 6 ? (hours.satCloseMin || hours.closeMin) : hours.closeMin; }
  function isOpen(iso) { return hours.days.indexOf(weekdayOf(iso)) !== -1; }
  function isPast(iso, startMin) { const today = isoToday(); if (iso < today) return true; if (iso > today) return false; return startMin <= nowMinTb(); }

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

  /* ---------- API helpers ---------- */
  async function apiGet(path) {
    const res = await fetch(API + path);
    if (res.status === 401) { window.SB.setSession(false); const e = new Error('unauthorized'); e.status = 401; throw e; }
    if (!res.ok) { const e = new Error(path + ' -> ' + res.status); e.status = res.status; throw e; }
    return res.json();
  }
  async function apiManage(body) {
    const res = await fetch(API + 'admin/manage.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status === 401) window.SB.setSession(false);
    const data = await res.json().catch(function () { return null; });
    if (!res.ok || !data || !data.ok) {
      const e = new Error('manage -> ' + res.status);
      e.status = res.status;
      e.reason = (data && data.reason) || 'error';
      throw e;
    }
    return data;
  }

  /* ---------- load everything (after sign-in) ---------- */
  async function load() {
    const d = await apiGet('admin/data.php');
    services = d.services || [];
    doctors = d.doctors || [];
    if (d.hours) hours = Object.assign({ stepMin: STEP_MIN }, d.hours);
    appts = d.appointments || [];
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
    try {
      const data = await apiManage({
        entity: 'appointment', action: 'create',
        doctorId: payload.doctorId, serviceId: payload.serviceId,
        dateISO: payload.dateISO, time: payload.time,
        patientName: payload.patientName.trim(), patientPhone: (payload.patientPhone || '').trim(),
        note: (payload.note || '').trim(), channel: payload.channel || 'phone',
      });
      appts.push({
        id: data.id, doctorId: payload.doctorId, serviceId: payload.serviceId,
        dateISO: payload.dateISO, time: payload.time, durationMin: dur,
        patientName: payload.patientName.trim(), patientPhone: (payload.patientPhone || '').trim(),
        patientEmail: null, note: (payload.note || '').trim() || null,
        channel: payload.channel || 'phone', status: 'booked', payments: null,
      });
      return { ok: true, id: data.id };
    } catch (err) {
      if (err.status === 409 || err.reason === 'taken') return { ok: false, reason: 'taken' };
      return { ok: false, reason: err.reason || 'error' };
    }
  }

  async function cancelAppointment(id) {
    try {
      await apiManage({ entity: 'appointment', action: 'cancel', id: id });
      const a = appts.find(function (x) { return String(x.id) === String(id); });
      if (a) a.status = 'cancelled';
      return true;
    } catch (e) { return false; }
  }

  async function completeAppointment(id, payments) {
    try {
      await apiManage({ entity: 'appointment', action: 'complete', id: id, payments: payments });
      const a = appts.find(function (x) { return String(x.id) === String(id); });
      if (a) { a.status = 'done'; a.payments = payments; }
      return true;
    } catch (e) { return false; }
  }

  /* ---------- doctors ---------- */
  async function upsertDoctor(d) {
    const existing = d.id ? doctor(d.id) : null;
    const data = await apiManage({
      entity: 'doctor', action: 'upsert',
      id: d.id || '', name: d.name != null ? d.name : undefined,
      role_ka: d.role_ka != null ? d.role_ka : undefined,
      role_en: d.role_en != null ? d.role_en : undefined,
      active: d.active != null ? d.active : undefined,
      services: d.services || undefined,
    });
    if (existing) {
      if (d.name != null) existing.name = d.name;
      if (d.active != null) existing.active = d.active;
      if (d.role_ka != null) existing.role_ka = d.role_ka;
      if (d.role_en != null) existing.role_en = d.role_en;
      if (d.services) existing.services = d.services.slice();
      return existing.id;
    }
    doctors.push({
      id: data.id, slug: 'doc-' + Date.now(), name: (d.name || '').trim(),
      role_ka: d.role_ka || null, role_en: d.role_en || null, roleKey: '',
      services: (d.services || []).slice(), active: d.active !== false, sort: doctors.length + 1,
    });
    return data.id;
  }

  async function removeDoctor(id) {
    try {
      await apiManage({ entity: 'doctor', action: 'delete', id: id });
      doctors = doctors.filter(function (d) { return d.id !== id; });
      appts = appts.filter(function (a) { return a.doctorId !== id; });
      return true;
    } catch (e) { return false; }
  }

  /* ---------- services ---------- */
  async function upsertService(s) {
    const existing = s.id ? svc(s.id) : null;
    const data = await apiManage({
      entity: 'service', action: 'upsert',
      id: s.id || '',
      name_ka: s.name_ka != null ? s.name_ka : undefined,
      name_en: s.name_en != null ? s.name_en : undefined,
      dur: s.dur != null ? s.dur : undefined,
      priceFrom: s.priceFrom != null ? s.priceFrom : undefined,
      priceTo: s.priceTo != null ? s.priceTo : undefined,
      active: s.active != null ? s.active : undefined,
    });
    if (existing) {
      if (s.dur != null) existing.dur = s.dur;
      if (s.priceFrom != null) existing.priceFrom = s.priceFrom;
      if (s.priceTo != null) existing.priceTo = s.priceTo;
      if (s.active != null) existing.active = s.active;
      if (s.name_ka != null) existing.name_ka = s.name_ka;
      if (s.name_en != null) existing.name_en = s.name_en;
      return existing.id;
    }
    services.push({
      id: data.id, name_ka: (s.name_ka || '').trim() || data.id, name_en: (s.name_en || '').trim() || data.id,
      dur: s.dur || 30,
      priceFrom: s.priceFrom != null ? s.priceFrom : null,
      priceTo: s.priceTo != null ? s.priceTo : null,
      active: s.active !== false, sort: services.length + 1, nameKey: null,
    });
    return data.id;
  }

  /* ---------- hours ---------- */
  async function setHours(h) {
    hours = Object.assign({}, hours, h);
    await apiManage({
      entity: 'hours', action: 'set',
      openMin: hours.openMin, closeMin: hours.closeMin,
      satCloseMin: hours.satCloseMin, days: hours.days,
    });
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
    completeAppointment: completeAppointment,
    upsertDoctor: upsertDoctor,
    removeDoctor: removeDoctor,
    upsertService: upsertService,
    setHours: setHours,
    toHHMM: toHHMM,
    toMin: toMin,
  };
})();
