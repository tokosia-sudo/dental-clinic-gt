/* ============================================================
   Dental Clinic GT — Booking widget (Fresha-style)
   Flow: service -> doctor -> day -> live time slots -> details -> confirm
   Reads/writes availability through ClinicData (data.js), shared with the admin panel.
   ============================================================ */
'use strict';

(function () {
  const BOOK_I18N = {
    ka: {
      step_service: 'სერვისი', step_doctor: 'ექიმი', step_date: 'დღე', step_time: 'თავისუფალი დრო',
      any_doctor: 'ნებისმიერი ექიმი', legend_free: 'თავისუფალი', legend_busy: 'დაკავებული',
      no_slots: 'ამ დღეს თავისუფალი დრო აღარ არის — სცადეთ სხვა დღე ან ექიმი.',
      closed_day: 'ამ დღეს კლინიკა დაკეტილია.',
      pick_slot_hint: 'აირჩიეთ თავისუფალი დრო, რომ გააგრძელოთ.',
      your_details: 'თქვენი მონაცემები', confirm: 'ჯავშნის დადასტურება',
      with_doctor: 'ექიმი', booked_for: 'არჩეული დრო', duration: 'ხანგრძლივობა', min: 'წთ', price: 'ფასი',
      slot_taken: 'ეს დრო ახლახან დაიკავეს — აირჩიეთ სხვა.',
      demo_note: 'ℹ️ სანიმუშო რეჟიმი — ჯავშნები ინახება მხოლოდ ამ ბრაუზერში. ცოცხალ რეჟიმში (Supabase) დაჯავშნული დრო მაშინვე დაიკეტება ყველასთვის.',
      today: 'დღეს', tomorrow: 'ხვალ',
    },
    en: {
      step_service: 'Service', step_doctor: 'Doctor', step_date: 'Day', step_time: 'Available time',
      any_doctor: 'Any doctor', legend_free: 'Available', legend_busy: 'Busy',
      no_slots: 'No free times left on this day — try another day or doctor.',
      closed_day: 'The clinic is closed on this day.',
      pick_slot_hint: 'Pick a free time to continue.',
      your_details: 'Your details', confirm: 'Confirm booking',
      with_doctor: 'Doctor', booked_for: 'Selected time', duration: 'Duration', min: 'min', price: 'Price',
      slot_taken: 'That time was just taken — please pick another.',
      demo_note: 'ℹ️ Sample mode — bookings are stored only in this browser. In live mode (Supabase) a booked slot closes instantly for everyone.',
      today: 'Today', tomorrow: 'Tomorrow',
    },
  };

  function lang() { return document.documentElement.lang || 'ka'; }
  function t(key) {
    const L = lang();
    const main = (typeof I18N !== 'undefined' && I18N[L]) || {};
    const book = BOOK_I18N[L] || {};
    return book[key] || main[key] || BOOK_I18N.ka[key] ||
      ((typeof I18N !== 'undefined' && I18N.ka && I18N.ka[key]) || key);
  }
  const D = window.ClinicData;
  function serviceName(s) { return t(s.nameKey) || (lang() === 'ka' ? s.name_ka : s.name_en); }
  function fmt(n) { return Number(n).toLocaleString('en-US'); }
  function servicePrice(s) { return s && s.priceTo ? (fmt(s.priceFrom) + '–' + fmt(s.priceTo) + ' ₾') : ''; }

  /* ---------- date helpers ---------- */
  function pad(n) { return String(n).padStart(2, '0'); }
  function isoDate(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function upcomingDays() {
    const days = []; const base = new Date(); base.setHours(0, 0, 0, 0);
    for (let i = 0; i < 14; i++) { const d = new Date(base); d.setDate(base.getDate() + i); days.push(d); }
    return days;
  }
  function dayLabel(d, i) {
    if (i === 0) return t('today');
    if (i === 1) return t('tomorrow');
    try { return new Intl.DateTimeFormat(lang() === 'ka' ? 'ka-GE' : 'en-US', { weekday: 'short' }).format(d); }
    catch (e) { return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]; }
  }
  function monthShort(d) {
    try { return new Intl.DateTimeFormat(lang() === 'ka' ? 'ka-GE' : 'en-US', { month: 'short' }).format(d); }
    catch (e) { return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]; }
  }

  /* ---------- state ---------- */
  const state = {
    serviceId: null, doctorId: 'any', dateISO: isoDate(new Date()),
    time: null, slotDoctorId: null,
    details: { name: '', phone: '', email: '', note: '' }, errors: {}, notice: '', done: false,
  };
  let root = null;

  function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  /* ---------- render helpers ---------- */
  function chip(active, act, id, label, sub) {
    return `<button type="button" class="bk-chip${active ? ' is-active' : ''}" data-act="${act}" data-id="${esc(id)}">
      <span>${esc(label)}</span>${sub ? `<small>${esc(sub)}</small>` : ''}</button>`;
  }

  function renderServices() {
    const services = D.getServices();
    return `<div class="bk-step"><span class="bk-step-label">1 · ${esc(t('step_service'))}</span>
      <div class="bk-chips">${services.map((s) => chip(s.id === state.serviceId, 'service', s.id, serviceName(s), servicePrice(s))).join('')}</div></div>`;
  }
  function renderDoctors() {
    const docs = D.getDoctorsForService(state.serviceId);
    const chips = [chip(state.doctorId === 'any', 'doctor', 'any', t('any_doctor'))]
      .concat(docs.map((d) => chip(d.id === state.doctorId, 'doctor', d.id, d.name, t(d.roleKey))));
    return `<div class="bk-step"><span class="bk-step-label">2 · ${esc(t('step_doctor'))}</span>
      <div class="bk-chips">${chips.join('')}</div></div>`;
  }
  function renderDates() {
    return `<div class="bk-step"><span class="bk-step-label">3 · ${esc(t('step_date'))}</span>
      <div class="bk-dates">${upcomingDays().map((d, i) => {
        const iso = isoDate(d);
        return `<button type="button" class="bk-date${iso === state.dateISO ? ' is-active' : ''}" data-act="date" data-id="${iso}">
          <small>${esc(dayLabel(d, i))}</small><strong>${d.getDate()}</strong><span>${esc(monthShort(d))}</span></button>`;
      }).join('')}</div></div>`;
  }
  function renderSlots() {
    const slots = D.getSlots(state.serviceId, state.doctorId, state.dateISO);
    const closed = slots.length && slots.every((s) => s.status === 'closed');
    const free = slots.filter((s) => s.status === 'free');
    const legend = `<div class="bk-legend"><span><i class="dot-free"></i>${esc(t('legend_free'))}</span><span><i class="dot-busy"></i>${esc(t('legend_busy'))}</span></div>`;
    let body;
    if (closed) body = `<p class="bk-empty">${esc(t('closed_day'))}</p>`;
    else if (!free.length) body = `<p class="bk-empty">${esc(t('no_slots'))}</p>`;
    else body = `<div class="bk-slots">${slots.map((s) => {
      if (s.status === 'closed') return '';
      if (s.status === 'past') return `<span class="bk-slot is-past" aria-disabled="true">${s.time}</span>`;
      if (s.status === 'busy') {
        const proc = s.procedureKey ? t(s.procedureKey) : t('legend_busy');
        return `<span class="bk-slot is-busy" aria-disabled="true" title="${esc(t('legend_busy'))}: ${esc(proc)}"><span class="bk-slot-time">${s.time}</span><span class="bk-slot-proc">${esc(proc)}</span></span>`;
      }
      const sel = (s.time === state.time) ? ' is-selected' : '';
      return `<button type="button" class="bk-slot is-free${sel}" data-act="slot" data-time="${s.time}" data-doctor="${esc(s.doctorId)}">${s.time}</button>`;
    }).join('')}</div>`;
    return `<div class="bk-step"><span class="bk-step-label">4 · ${esc(t('step_time'))}</span>${legend}${body}
      ${state.notice ? `<p class="bk-notice">${esc(state.notice)}</p>` : ''}</div>`;
  }
  function renderDetails() {
    if (!state.time) return `<p class="bk-hint">${esc(t('pick_slot_hint'))}</p>`;
    const doc = state.slotDoctorId ? D.getDoctor(state.slotDoctorId) : null;
    const s = D.getServices().find((x) => x.id === state.serviceId);
    const e = state.errors;
    const fld = (id, labelKey, type, optional) => `<div class="field">
      <label for="bk-${id}">${esc(t(labelKey))}${optional ? ` <span class="opt">${esc(t('form_optional'))}</span>` : ''}</label>
      <input id="bk-${id}" data-field="${id}" type="${type}" value="${esc(state.details[id])}" autocomplete="${id === 'name' ? 'name' : id === 'phone' ? 'tel' : id === 'email' ? 'email' : 'off'}" />
      <span class="error">${e[id] ? esc(t(e[id])) : ''}</span></div>`;
    return `<div class="bk-summary">
      <div><small>${esc(t('booked_for'))}</small><strong>${esc(state.dateISO)} · ${esc(state.time)}</strong></div>
      ${doc ? `<div><small>${esc(t('with_doctor'))}</small><strong>${esc(doc.name)}</strong></div>` : ''}
      <div><small>${esc(t('step_service'))}</small><strong>${esc(s ? serviceName(s) : '')} · ${s ? s.dur : ''}${esc(t('min'))}</strong></div>
      <div class="bk-sum-price"><small>${esc(t('price'))}</small><strong>${esc(s ? servicePrice(s) : '')}</strong></div>
    </div>
    <div class="bk-step"><span class="bk-step-label">5 · ${esc(t('your_details'))}</span>
      ${fld('name', 'form_name', 'text', false)}
      <div class="field-row">${fld('phone', 'form_phone', 'tel', false)}${fld('email', 'form_email', 'email', true)}</div>
      <div class="field"><label for="bk-note">${esc(t('form_message'))} <span class="opt">${esc(t('form_optional'))}</span></label>
        <textarea id="bk-note" data-field="note" rows="2">${esc(state.details.note)}</textarea></div>
      <button type="button" class="btn btn-primary btn-block" data-act="confirm">${esc(t('confirm'))}</button></div>`;
  }
  function renderSuccess() {
    return `<div class="bk-success" role="status" tabindex="-1">
      <svg viewBox="0 0 24 24" width="46" height="46" aria-hidden="true"><path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>
      <strong>${esc(t('form_success_title'))}</strong><span>${esc(t('form_success_text'))}</span>
      <button type="button" class="btn btn-ghost btn-sm" data-act="reset">${esc(t('form_book_another'))}</button></div>`;
  }
  function render() {
    if (!root) return;
    if (state.done) { root.innerHTML = renderSuccess(); const el = root.querySelector('.bk-success'); if (el) el.focus(); return; }
    root.innerHTML = renderServices() + renderDoctors() + renderDates() + renderSlots() + renderDetails() +
      `<p class="bk-demo">${esc(t('demo_note'))}</p>`;
  }

  /* ---------- interactions ---------- */
  function onClick(e) {
    const btn = e.target.closest('[data-act]'); if (!btn) return;
    const act = btn.getAttribute('data-act');
    if (act === 'service') {
      state.serviceId = btn.getAttribute('data-id');
      const dd = D.getDoctor(state.doctorId);
      if (state.doctorId !== 'any' && (!dd || !dd.services.includes(state.serviceId))) state.doctorId = 'any';
      state.time = null; state.slotDoctorId = null; state.notice = ''; render();
    } else if (act === 'doctor') {
      state.doctorId = btn.getAttribute('data-id'); state.time = null; state.slotDoctorId = null; state.notice = ''; render();
    } else if (act === 'date') {
      state.dateISO = btn.getAttribute('data-id'); state.time = null; state.slotDoctorId = null; state.notice = ''; render();
    } else if (act === 'slot') {
      state.time = btn.getAttribute('data-time'); state.slotDoctorId = btn.getAttribute('data-doctor') || null;
      state.errors = {}; state.notice = ''; render();
      const sum = root.querySelector('.bk-summary'); if (sum) sum.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else if (act === 'confirm') { confirmBooking(); }
    else if (act === 'reset') {
      state.done = false; state.time = null; state.slotDoctorId = null; state.notice = '';
      state.details = { name: '', phone: '', email: '', note: '' }; state.errors = {}; render();
    }
  }
  function onInput(e) { const f = e.target.getAttribute && e.target.getAttribute('data-field'); if (f) state.details[f] = e.target.value; }

  function confirmBooking() {
    const d = state.details; const errors = {};
    if (!d.name.trim()) errors.name = 'err_required'; else if (d.name.trim().length < 2) errors.name = 'err_name';
    const phone = d.phone.replace(/[\s\-()]/g, '');
    if (!d.phone.trim()) errors.phone = 'err_required'; else if (!/^\+?\d{6,15}$/.test(phone)) errors.phone = 'err_phone';
    if (d.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) errors.email = 'err_email';
    state.errors = errors;
    if (Object.keys(errors).length) { render(); const er = root.querySelector('.error'); if (er) er.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }

    const res = D.createAppointment({
      serviceId: state.serviceId,
      doctorId: state.slotDoctorId || (D.getDoctorsForService(state.serviceId)[0] || {}).id,
      dateISO: state.dateISO, time: state.time,
      patientName: d.name, patientPhone: d.phone, patientEmail: d.email, note: d.note, channel: 'online',
    });
    if (res.ok) { state.done = true; render(); }
    else if (res.reason === 'taken') { state.time = null; state.slotDoctorId = null; state.notice = t('slot_taken'); render(); }
    else { state.errors = { phone: 'err_phone' }; render(); }
  }

  /* ---------- init ---------- */
  function init() {
    root = document.getElementById('bookingApp');
    if (!root || !D) return;
    // sensible default service
    const services = D.getServices();
    if (services.length) state.serviceId = services[0].id;
    root.addEventListener('click', onClick);
    root.addEventListener('input', onInput);
    window.onLangChange = render;
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
