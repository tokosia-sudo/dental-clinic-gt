/* ============================================================
   Dental Clinic GT — Admin panel
   Manage the schedule (who/when/which doctor/which procedure/how long),
   add phone & messenger bookings, and manage doctors / services / hours.
   Uses ClinicData (data.js) — same store the booking page writes to.

   PHASE 1: simple passcode gate (DEMO ONLY — not real security).
   PHASE 2: replaced by real Supabase Auth + server-side rules.
   ============================================================ */
'use strict';

(function () {
  const DEMO_PASS = 'admin'; // DEMO ONLY — replaced by real login in Phase 2
  const D = window.ClinicData;

  const ADMIN_I18N = {
    ka: {
      panel: 'ადმინ-პანელი',
      login_title: 'შესვლა', login_hint: 'შეიყვანეთ კოდი (დემო: admin)', login_btn: 'შესვლა', login_err: 'არასწორი კოდი',
      logout: 'გასვლა',
      tab_schedule: 'განრიგი', tab_add: 'ჩაწერის დამატება', tab_doctors: 'ექიმები', tab_services: 'სერვისები', tab_prices: 'ფასები', tab_hours: 'საათები',
      price_from: 'დან (₾)', price_to: 'მდე (₾)', category: 'კატეგორია', pcat_gen: 'ზოგადი', pcat_cosm: 'ესთეტიკა', pcat_surg: 'ქირურგია/პროთეზი', pcat_ortho: 'ორთოდონტია', pcat_kids: 'ბავშვები',
      date: 'თარიღი', doctor: 'ექიმი', service: 'სერვისი', time: 'დრო', patient: 'პაციენტი', phone: 'ტელეფონი', channel: 'არხი', note: 'შენიშვნა', duration: 'ხანგრძლივობა', action: 'მოქმედება',
      add_btn: 'ჩაწერის დამატება', cancel: 'გაუქმება', cancel_confirm: 'დარწმუნებული ხართ, რომ გსურთ ამ ჩაწერის გაუქმება?',
      ch_online: 'ონლაინ', ch_phone: 'ტელეფონი', ch_messenger: 'მესენჯერი', ch_walkin: 'ადგილზე',
      no_appts: 'ამ დღეს ჩანაწერი არ არის.', count_today: 'ჩაწერა ამ დღეს',
      active: 'აქტიური', inactive: 'არააქტიური', remove: 'წაშლა', save: 'შენახვა', add: 'დამატება', edit: 'რედაქტირება',
      role: 'პოზიცია', services_label: 'სერვისები', duration_min: 'ხანგრძლივობა (წთ)', name: 'სახელი',
      open: 'გახსნა', close: 'დახურვა', sat_close: 'შაბათს დახურვა', step: 'ინტერვალი (წთ)', days: 'სამუშაო დღეები',
      added_ok: 'ჩაწერა დაემატა ✓', slot_taken: 'ეს დრო უკვე დაკავებულია — აირჩიეთ სხვა.', fill_required: 'შეავსეთ სავალდებულო ველები სწორად.',
      pick_time: '— აირჩიეთ დრო —', no_free: 'თავისუფალი დრო არ არის',
      demo_banner: 'სანიმუშო რეჟიმი — მონაცემები ინახება ამ ბრაუზერში. Supabase-ის ჩართვის შემდეგ გახდება ცოცხალი და დაცული.',
      back_site: '← საიტზე',
    },
    en: {
      panel: 'Admin panel',
      login_title: 'Sign in', login_hint: 'Enter the code (demo: admin)', login_btn: 'Sign in', login_err: 'Wrong code',
      logout: 'Sign out',
      tab_schedule: 'Schedule', tab_add: 'Add booking', tab_doctors: 'Doctors', tab_services: 'Services', tab_prices: 'Prices', tab_hours: 'Hours',
      price_from: 'From (₾)', price_to: 'To (₾)', category: 'Category', pcat_gen: 'General', pcat_cosm: 'Cosmetic', pcat_surg: 'Surgery/Prosth.', pcat_ortho: 'Orthodontics', pcat_kids: 'Kids',
      date: 'Date', doctor: 'Doctor', service: 'Service', time: 'Time', patient: 'Patient', phone: 'Phone', channel: 'Channel', note: 'Note', duration: 'Duration', action: 'Action',
      add_btn: 'Add booking', cancel: 'Cancel', cancel_confirm: 'Are you sure you want to cancel this booking?',
      ch_online: 'Online', ch_phone: 'Phone', ch_messenger: 'Messenger', ch_walkin: 'Walk-in',
      no_appts: 'No bookings on this day.', count_today: 'bookings this day',
      active: 'Active', inactive: 'Inactive', remove: 'Delete', save: 'Save', add: 'Add', edit: 'Edit',
      role: 'Role', services_label: 'Services', duration_min: 'Duration (min)', name: 'Name',
      open: 'Open', close: 'Close', sat_close: 'Saturday close', step: 'Interval (min)', days: 'Working days',
      added_ok: 'Booking added ✓', slot_taken: 'That time is already taken — pick another.', fill_required: 'Please fill the required fields correctly.',
      pick_time: '— pick a time —', no_free: 'No free times',
      demo_banner: 'Sample mode — data is stored in this browser. After Supabase is connected it becomes live and secure.',
      back_site: '← Site',
    },
  };

  function lang() { return document.documentElement.lang || 'ka'; }
  function t(key) {
    const L = lang();
    const a = ADMIN_I18N[L] || {};
    const main = (typeof I18N !== 'undefined' && I18N[L]) || {};
    return a[key] || main[key] || ADMIN_I18N.ka[key] || ((typeof I18N !== 'undefined' && I18N.ka && I18N.ka[key]) || key);
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function serviceName(s) { if (!s) return ''; return (s.nameKey && t(s.nameKey) !== s.nameKey ? t(s.nameKey) : (lang() === 'ka' ? s.name_ka : s.name_en)) || s.id; }
  function doctorRole(d) { return d && d.roleKey ? t(d.roleKey) : ''; }
  function channelLabel(c) { return t('ch_' + (c || 'online')) || c; }
  function pad(n) { return String(n).padStart(2, '0'); }
  function isoToday() { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function endTime(a) { return D.toHHMM(D.toMin(a.time) + (a.durationMin || 30)); }

  const state = {
    tab: 'schedule',
    dateISO: isoToday(),
    add: { doctorId: '', serviceId: '', dateISO: isoToday(), time: '', name: '', phone: '', channel: 'phone', note: '' },
    msg: '',
  };
  let root = null;

  /* ---------- auth ---------- */
  function authed() { try { return sessionStorage.getItem('dcgt_admin') === '1'; } catch (e) { return false; } }
  function setAuthed(v) { try { v ? sessionStorage.setItem('dcgt_admin', '1') : sessionStorage.removeItem('dcgt_admin'); } catch (e) {} }

  function renderLogin(err) {
    root.innerHTML = `<div class="adm-login">
      <div class="adm-login-card">
        <span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28"><path fill="currentColor" d="M12 2C8.5 2 7 4 4.8 4 3 4 2 5.5 2 8c0 3 1 5 1.8 8.5.5 2.2 1 4.5 2.2 4.5 1.3 0 1.4-2.5 2-4.5.4-1.4.9-2.5 2-2.5s1.6 1.1 2 2.5c.6 2 .7 4.5 2 4.5 1.2 0 1.7-2.3 2.2-4.5C21.9 13 23 11 23 8c0-2.5-1-4-2.8-4C18 4 16.5 2 12 2z"/></svg></span>
        <h1>Dental Clinic GT</h1>
        <p class="adm-sub">${esc(t('panel'))}</p>
        <div class="field"><label for="adm-pass">${esc(t('login_title'))}</label>
          <input id="adm-pass" type="password" data-field="pass" placeholder="${esc(t('login_hint'))}" /></div>
        ${err ? `<p class="adm-err">${esc(t('login_err'))}</p>` : ''}
        <button type="button" class="btn btn-primary btn-block" data-act="login">${esc(t('login_btn'))}</button>
        <a href="index.html" class="adm-back">${esc(t('back_site'))}</a>
      </div></div>`;
    const inp = root.querySelector('#adm-pass');
    if (inp) inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryLogin(); });
  }
  function tryLogin() {
    const inp = root.querySelector('#adm-pass');
    if (inp && inp.value === DEMO_PASS) { setAuthed(true); render(); }
    else renderLogin(true);
  }

  /* ---------- shell ---------- */
  function renderShell(inner) {
    const tabs = ['schedule', 'add', 'doctors', 'services', 'hours'];
    return `<header class="adm-topbar">
      <div class="adm-brand"><span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M12 2C8.5 2 7 4 4.8 4 3 4 2 5.5 2 8c0 3 1 5 1.8 8.5.5 2.2 1 4.5 2.2 4.5 1.3 0 1.4-2.5 2-4.5.4-1.4.9-2.5 2-2.5s1.6 1.1 2 2.5c.6 2 .7 4.5 2 4.5 1.2 0 1.7-2.3 2.2-4.5C21.9 13 23 11 23 8c0-2.5-1-4-2.8-4C18 4 16.5 2 12 2z"/></svg></span>
        <strong>Dental Clinic GT</strong><span class="adm-tag">${esc(t('panel'))}</span></div>
      <div class="adm-top-actions">
        <button class="lang-toggle" data-act="lang" type="button"><span>${lang() === 'ka' ? 'EN' : 'ქარ'}</span></button>
        <a href="index.html" class="btn btn-ghost btn-sm">${esc(t('back_site'))}</a>
        <button class="btn btn-ghost btn-sm" data-act="logout" type="button">${esc(t('logout'))}</button>
      </div>
    </header>
    <p class="adm-demo">${esc(t('demo_banner'))}</p>
    <nav class="adm-tabs">${tabs.map((tb) => `<button type="button" class="adm-tab${state.tab === tb ? ' is-active' : ''}" data-act="tab" data-id="${tb}">${esc(t('tab_' + tb))}</button>`).join('')}</nav>
    ${state.msg ? `<p class="adm-msg">${esc(state.msg)}</p>` : ''}
    <div class="adm-body">${inner}</div>`;
  }

  /* ---------- tab: schedule ---------- */
  function renderSchedule() {
    const docs = D.getDoctors();
    const all = D.listAppointments({ dateISO: state.dateISO });
    const head = `<div class="adm-controls">
      <div class="field"><label for="adm-date">${esc(t('date'))}</label><input id="adm-date" type="date" data-field="schedDate" value="${esc(state.dateISO)}" /></div>
      <span class="adm-count">${all.length} ${esc(t('count_today'))}</span>
    </div>`;
    if (!all.length) return head + `<p class="adm-empty">${esc(t('no_appts'))}</p>`;
    const cols = docs.map((doc) => {
      const list = all.filter((a) => a.doctorId === doc.id);
      const rows = list.length ? list.map((a) => {
        const s = D.getAllServices().find((x) => x.id === a.serviceId);
        return `<div class="adm-appt">
          <div class="adm-appt-time">${esc(a.time)}–${esc(endTime(a))}<small>${a.durationMin}${esc(t('min') || 'min')}</small></div>
          <div class="adm-appt-main">
            <strong>${esc(serviceName(s))}</strong>
            <span>${esc(a.patientName)} · <a href="tel:${esc(a.patientPhone)}">${esc(a.patientPhone)}</a></span>
            ${a.note ? `<em>${esc(a.note)}</em>` : ''}
          </div>
          <span class="adm-chan chan-${esc(a.channel)}">${esc(channelLabel(a.channel))}</span>
          <button type="button" class="adm-x" data-act="cancel" data-id="${esc(a.id)}" title="${esc(t('cancel'))}">✕</button>
        </div>`;
      }).join('') : `<p class="adm-empty sm">${esc(t('no_appts'))}</p>`;
      return `<section class="adm-doc-col"><h3>${esc(doc.name)} <small>${esc(doctorRole(doc))}</small></h3>${rows}</section>`;
    }).join('');
    return head + `<div class="adm-sched">${cols}</div>`;
  }

  /* ---------- tab: add booking ---------- */
  function freeTimesFor(serviceId, doctorId, dateISO) {
    if (!serviceId || !doctorId) return [];
    return D.getSlots(serviceId, doctorId, dateISO).filter((s) => s.status === 'free').map((s) => s.time);
  }
  function renderAdd() {
    const a = state.add;
    const docs = D.getDoctors();
    const doc = D.getDoctor(a.doctorId);
    const services = doc ? D.getAllServices().filter((s) => s.active && doc.services.includes(s.id)) : [];
    const times = freeTimesFor(a.serviceId, a.doctorId, a.dateISO);
    const channels = ['phone', 'messenger', 'walkin', 'online'];
    return `<form class="adm-form" autocomplete="off">
      <div class="field-row">
        <div class="field"><label>${esc(t('doctor'))}</label>
          <select data-field="doctorId"><option value="">—</option>${docs.map((d) => `<option value="${d.id}"${d.id === a.doctorId ? ' selected' : ''}>${esc(d.name)}</option>`).join('')}</select></div>
        <div class="field"><label>${esc(t('service'))}</label>
          <select data-field="serviceId"${doc ? '' : ' disabled'}><option value="">—</option>${services.map((s) => `<option value="${s.id}"${s.id === a.serviceId ? ' selected' : ''}>${esc(serviceName(s))} · ${s.dur}${esc(t('min') || 'min')}</option>`).join('')}</select></div>
      </div>
      <div class="field-row">
        <div class="field"><label>${esc(t('date'))}</label><input type="date" data-field="addDate" value="${esc(a.dateISO)}" min="${esc(isoToday())}" /></div>
        <div class="field"><label>${esc(t('time'))}</label>
          <select data-field="time"${times.length ? '' : ' disabled'}><option value="">${esc(times.length ? t('pick_time') : t('no_free'))}</option>${times.map((tm) => `<option value="${tm}"${tm === a.time ? ' selected' : ''}>${tm}</option>`).join('')}</select></div>
      </div>
      <div class="field-row">
        <div class="field"><label>${esc(t('patient'))} ${esc(t('name'))}</label><input type="text" data-field="name" value="${esc(a.name)}" /></div>
        <div class="field"><label>${esc(t('phone'))}</label><input type="tel" data-field="phone" value="${esc(a.phone)}" placeholder="+995 5xx xx xx xx" /></div>
      </div>
      <div class="field-row">
        <div class="field"><label>${esc(t('channel'))}</label>
          <select data-field="channel">${channels.map((c) => `<option value="${c}"${c === a.channel ? ' selected' : ''}>${esc(channelLabel(c))}</option>`).join('')}</select></div>
        <div class="field"><label>${esc(t('note'))}</label><input type="text" data-field="note" value="${esc(a.note)}" /></div>
      </div>
      <button type="button" class="btn btn-primary" data-act="addAppt">${esc(t('add_btn'))}</button>
    </form>`;
  }

  /* ---------- tab: doctors ---------- */
  function renderDoctors() {
    const docs = D.getAllDoctors();
    const services = D.getAllServices();
    const rows = docs.map((d) => `<tr>
      <td><strong>${esc(d.name)}</strong><br><small>${esc(doctorRole(d))}</small></td>
      <td>${d.services.map((sid) => { const s = services.find((x) => x.id === sid); return `<span class="adm-pill">${esc(serviceName(s))}</span>`; }).join(' ')}</td>
      <td><button type="button" class="adm-toggle${d.active ? ' on' : ''}" data-act="docActive" data-id="${esc(d.id)}">${esc(d.active ? t('active') : t('inactive'))}</button></td>
      <td><button type="button" class="adm-x" data-act="docDelete" data-id="${esc(d.id)}">${esc(t('remove'))}</button></td>
    </tr>`).join('');
    const svcChecks = services.map((s) => `<label class="adm-check"><input type="checkbox" data-newdoc-svc="${s.id}" /> ${esc(serviceName(s))}</label>`).join('');
    return `<table class="adm-table"><thead><tr><th>${esc(t('name'))}</th><th>${esc(t('services_label'))}</th><th>${esc(t('active'))}</th><th>${esc(t('action'))}</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="adm-card">
        <h3>${esc(t('add'))}: ${esc(t('doctor'))}</h3>
        <div class="field-row">
          <div class="field"><label>${esc(t('name'))}</label><input type="text" id="newdoc-name" placeholder="Dr. ..." /></div>
          <div class="field"><label>${esc(t('role'))}</label><input type="text" id="newdoc-role" placeholder="${esc(t('role'))}" /></div>
        </div>
        <div class="field"><label>${esc(t('services_label'))}</label><div class="adm-checks">${svcChecks}</div></div>
        <button type="button" class="btn btn-primary" data-act="docAdd">${esc(t('add'))}</button>
      </div>`;
  }

  /* ---------- tab: services ---------- */
  function renderServices() {
    const services = D.getAllServices();
    const rows = services.map((s) => `<tr>
      <td><strong>${esc(serviceName(s))}</strong></td>
      <td><input type="number" class="adm-num" min="10" max="240" step="5" value="${s.dur}" data-svc-dur="${s.id}" /> ${esc(t('min') || 'min')}</td>
      <td><input type="number" class="adm-num" min="0" step="10" value="${s.priceFrom || 0}" data-svc-from="${s.id}" /></td>
      <td><input type="number" class="adm-num" min="0" step="10" value="${s.priceTo || 0}" data-svc-to="${s.id}" /></td>
      <td><button type="button" class="adm-toggle${s.active ? ' on' : ''}" data-act="svcActive" data-id="${esc(s.id)}">${esc(s.active ? t('active') : t('inactive'))}</button></td>
      <td><button type="button" class="btn btn-ghost btn-sm" data-act="svcSave" data-id="${esc(s.id)}">${esc(t('save'))}</button></td>
    </tr>`).join('');
    return `<table class="adm-table"><thead><tr><th>${esc(t('service'))}</th><th>${esc(t('duration_min'))}</th><th>${esc(t('price_from'))}</th><th>${esc(t('price_to'))}</th><th>${esc(t('active'))}</th><th>${esc(t('action'))}</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="adm-card">
        <h3>${esc(t('add'))}: ${esc(t('service'))}</h3>
        <div class="field-row">
          <div class="field"><label>${esc(t('name'))} (KA)</label><input type="text" id="newsvc-ka" /></div>
          <div class="field"><label>${esc(t('name'))} (EN)</label><input type="text" id="newsvc-en" /></div>
          <div class="field"><label>${esc(t('duration_min'))}</label><input type="number" id="newsvc-dur" value="30" min="10" max="240" step="5" /></div>
        </div>
        <div class="field-row">
          <div class="field"><label>${esc(t('price_from'))}</label><input type="number" id="newsvc-from" value="0" min="0" step="10" /></div>
          <div class="field"><label>${esc(t('price_to'))}</label><input type="number" id="newsvc-to" value="0" min="0" step="10" /></div>
        </div>
        <button type="button" class="btn btn-primary" data-act="svcAdd">${esc(t('add'))}</button>
      </div>`;
  }

  /* ---------- tab: hours ---------- */
  function renderHours() {
    const h = D.getHours();
    const dayNames = lang() === 'ka' ? ['კვ', 'ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days = [1, 2, 3, 4, 5, 6, 0].map((wd) => `<label class="adm-check"><input type="checkbox" data-hours-day="${wd}"${h.days.includes(wd) ? ' checked' : ''}/> ${esc(dayNames[wd])}</label>`).join('');
    return `<div class="adm-card">
      <div class="field-row">
        <div class="field"><label>${esc(t('open'))}</label><input type="time" id="h-open" value="${esc(D.toHHMM(h.openMin))}" /></div>
        <div class="field"><label>${esc(t('close'))}</label><input type="time" id="h-close" value="${esc(D.toHHMM(h.closeMin))}" /></div>
        <div class="field"><label>${esc(t('sat_close'))}</label><input type="time" id="h-sat" value="${esc(D.toHHMM(h.satCloseMin || h.closeMin))}" /></div>
        <div class="field"><label>${esc(t('step'))}</label><input type="number" id="h-step" value="${h.stepMin}" min="10" max="60" step="5" /></div>
      </div>
      <div class="field"><label>${esc(t('days'))}</label><div class="adm-checks">${days}</div></div>
      <button type="button" class="btn btn-primary" data-act="hoursSave">${esc(t('save'))}</button>
    </div>`;
  }

  /* ---------- render ---------- */
  function render() {
    if (!root) return;
    if (!authed()) { renderLogin(false); return; }
    let inner = '';
    if (state.tab === 'schedule') inner = renderSchedule();
    else if (state.tab === 'add') inner = renderAdd();
    else if (state.tab === 'doctors') inner = renderDoctors();
    else if (state.tab === 'services') inner = renderServices();
    else if (state.tab === 'hours') inner = renderHours();
    root.innerHTML = renderShell(inner);
  }

  /* ---------- interactions ---------- */
  function onClick(e) {
    const btn = e.target.closest('[data-act]'); if (!btn) return;
    const act = btn.getAttribute('data-act'); const id = btn.getAttribute('data-id');
    if (act === 'login') return tryLogin();
    if (act === 'logout') { setAuthed(false); state.msg = ''; return render(); }
    if (act === 'lang') { const next = lang() === 'ka' ? 'en' : 'ka'; if (typeof applyLang === 'function') applyLang(next); else document.documentElement.lang = next; render(); return; }
    if (act === 'tab') { state.tab = id; state.msg = ''; return render(); }

    if (act === 'cancel') { if (window.confirm(t('cancel_confirm'))) { D.cancelAppointment(id); render(); } return; }

    if (act === 'addAppt') return addAppointment();

    if (act === 'docActive') { const d = D.getDoctor(id); if (d) { D.upsertDoctor({ id, active: !d.active }); render(); } return; }
    if (act === 'docDelete') { if (window.confirm(t('cancel_confirm'))) { D.removeDoctor(id); render(); } return; }
    if (act === 'docAdd') return addDoctor();

    if (act === 'svcActive') { const s = D.getAllServices().find((x) => x.id === id); if (s) { D.upsertService({ id, active: !s.active }); render(); } return; }
    if (act === 'svcSave') {
      const dur = root.querySelector(`[data-svc-dur="${id}"]`);
      const pf = root.querySelector(`[data-svc-from="${id}"]`);
      const pt = root.querySelector(`[data-svc-to="${id}"]`);
      D.upsertService({ id, dur: parseInt(dur && dur.value, 10) || 30, priceFrom: parseInt(pf && pf.value, 10) || 0, priceTo: parseInt(pt && pt.value, 10) || 0 });
      state.msg = t('added_ok'); render(); return;
    }
    if (act === 'svcAdd') return addService();

    if (act === 'hoursSave') return saveHours();
  }

  function onInput(e) {
    const f = e.target.getAttribute && e.target.getAttribute('data-field');
    if (!f) return;
    if (f === 'schedDate') { state.dateISO = e.target.value; render(); return; }
    if (f === 'doctorId') { state.add.doctorId = e.target.value; state.add.serviceId = ''; state.add.time = ''; render(); return; }
    if (f === 'serviceId') { state.add.serviceId = e.target.value; state.add.time = ''; render(); return; }
    if (f === 'addDate') { state.add.dateISO = e.target.value; state.add.time = ''; render(); return; }
    if (f === 'time') { state.add.time = e.target.value; return; }
    if (['name', 'phone', 'note', 'channel'].includes(f)) { state.add[f] = e.target.value; return; }
  }

  function addAppointment() {
    const a = state.add;
    if (!a.doctorId || !a.serviceId || !a.time || a.name.trim().length < 2 || !/^\+?[0-9\s\-()]{6,20}$/.test(a.phone)) {
      state.msg = t('fill_required'); render(); return;
    }
    const res = D.createAppointment({
      doctorId: a.doctorId, serviceId: a.serviceId, dateISO: a.dateISO, time: a.time,
      patientName: a.name, patientPhone: a.phone, note: a.note, channel: a.channel,
    });
    if (res.ok) {
      state.add = { doctorId: '', serviceId: '', dateISO: a.dateISO, time: '', name: '', phone: '', channel: a.channel, note: '' };
      state.msg = t('added_ok'); state.tab = 'schedule'; state.dateISO = a.dateISO; render();
    } else { state.msg = res.reason === 'taken' ? t('slot_taken') : t('fill_required'); render(); }
  }

  function addDoctor() {
    const name = (root.querySelector('#newdoc-name') || {}).value || '';
    const role = (root.querySelector('#newdoc-role') || {}).value || '';
    if (name.trim().length < 2) { state.msg = t('fill_required'); return render(); }
    const services = Array.from(root.querySelectorAll('[data-newdoc-svc]:checked')).map((c) => c.getAttribute('data-newdoc-svc'));
    D.upsertDoctor({ id: 'doc' + Date.now(), name: name.trim(), roleKey: '', role_ka: role, role_en: role, services, active: true });
    state.msg = t('added_ok'); render();
  }

  function addService() {
    const ka = (root.querySelector('#newsvc-ka') || {}).value || '';
    const en = (root.querySelector('#newsvc-en') || {}).value || '';
    const dur = parseInt((root.querySelector('#newsvc-dur') || {}).value, 10) || 30;
    const pf = parseInt((root.querySelector('#newsvc-from') || {}).value, 10) || 0;
    const pt = parseInt((root.querySelector('#newsvc-to') || {}).value, 10) || 0;
    if (ka.trim().length < 2 && en.trim().length < 2) { state.msg = t('fill_required'); return render(); }
    D.upsertService({ id: 'svc' + Date.now(), name_ka: ka.trim() || en.trim(), name_en: en.trim() || ka.trim(), dur, priceFrom: pf, priceTo: pt, active: true });
    state.msg = t('added_ok'); render();
  }

  function saveHours() {
    const toMin = (v) => { const [h, m] = (v || '').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
    const days = Array.from(root.querySelectorAll('[data-hours-day]:checked')).map((c) => parseInt(c.getAttribute('data-hours-day'), 10));
    D.setHours({
      openMin: toMin((root.querySelector('#h-open') || {}).value),
      closeMin: toMin((root.querySelector('#h-close') || {}).value),
      satCloseMin: toMin((root.querySelector('#h-sat') || {}).value),
      stepMin: parseInt((root.querySelector('#h-step') || {}).value, 10) || 30,
      days,
    });
    state.msg = t('added_ok'); render();
  }

  /* ---------- init ---------- */
  function init() {
    root = document.getElementById('adminApp');
    if (!root || !D) return;
    root.addEventListener('click', onClick);
    root.addEventListener('input', onInput);
    window.onLangChange = render;
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
