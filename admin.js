/* ============================================================
   Dental Clinic GT — Admin panel (LIVE)
   Manage the schedule, add phone/messenger/walk-in bookings, manage
   doctors / services / hours, and export bookings to Excel (CSV).
   Backed by Supabase (window.ClinicData from supabase-admin-data.js).

   Sign-in is real (Supabase Auth, email + password). Only a signed-in
   staff member can read patient details or change anything.
   ============================================================ */
'use strict';

(function () {
  const D = window.ClinicData;

  const ADMIN_I18N = {
    ka: {
      panel: 'ადმინ-პანელი',
      login_title: 'შესვლა', login_email: 'ელ. ფოსტა', login_password: 'პაროლი', login_btn: 'შესვლა', login_err: 'არასწორი ელ. ფოსტა ან პაროლი',
      loading: 'იტვირთება…', logout: 'გასვლა',
      tab_schedule: 'განრიგი', tab_add: 'ჩაწერის დამატება', tab_doctors: 'ექიმები', tab_services: 'სერვისები', tab_prices: 'ფასები', tab_hours: 'საათები',
      price_from: 'დან (₾)', price_to: 'მდე (₾)', category: 'კატეგორია', pcat_gen: 'ზოგადი', pcat_cosm: 'ესთეტიკა', pcat_surg: 'ქირურგია/პროთეზი', pcat_ortho: 'ორთოდონტია', pcat_kids: 'ბავშვები',
      date: 'თარიღი', doctor: 'ექიმი', service: 'სერვისი', time: 'დრო', patient: 'პაციენტი', phone: 'ტელეფონი', channel: 'არხი', note: 'შენიშვნა', duration: 'ხანგრძლივობა', action: 'მოქმედება',
      add_btn: 'ჩაწერის დამატება', cancel: 'გაუქმება', cancel_confirm: 'დარწმუნებული ხართ, რომ გსურთ ამ ჩაწერის გაუქმება?',
      ch_online: 'ონლაინ', ch_phone: 'ტელეფონი', ch_messenger: 'მესენჯერი', ch_walkin: 'ადგილზე',
      no_appts: 'ამ დღეს ჩანაწერი არ არის.', count_today: 'ჩაწერა ამ დღეს', export: 'Excel-ში ჩამოტვირთვა',
      active: 'აქტიური', inactive: 'არააქტიური', remove: 'წაშლა', save: 'შენახვა', add: 'დამატება', edit: 'რედაქტირება',
      role: 'პოზიცია', services_label: 'სერვისები', duration_min: 'ხანგრძლივობა (წთ)', name: 'სახელი',
      open: 'გახსნა', close: 'დახურვა', sat_close: 'შაბათს დახურვა', step: 'ინტერვალი (წთ)', days: 'სამუშაო დღეები',
      added_ok: 'შესრულდა ✓', slot_taken: 'ეს დრო უკვე დაკავებულია — აირჩიეთ სხვა.', fill_required: 'შეავსეთ სავალდებულო ველები სწორად.', save_err: 'ვერ შესრულდა — სცადეთ თავიდან.',
      pick_time: '— აირჩიეთ დრო —', no_free: 'თავისუფალი დრო არ არის',
      live_banner: 'ცოცხალი რეჟიმი — მონაცემები დაცულ ონლაინ ბაზაშია.',
      back_site: '← საიტზე',
      tab_reports: 'რეპორტი',
      complete: 'დასრულება', done_label: 'დასრულებულია', close_label: 'დახურვა',
      pay_title: 'ვიზიტის დასრულება — გადახდა',
      pay_amount: 'თანხა (₾)', pay_method: 'გადახდის მეთოდი', pay_ref: 'სერვისის ფასი',
      pm_tbc: 'TBC ტერმინალი', pm_bog: 'საქ. ბანკის ტერმინალი', pm_cash: 'ნაღდი', pm_installment: 'განვადება',
      pay_split: '+ გაყოფილი გადახდა (ორი მეთოდი)', pay_split_off: '− მეორე გადახდის მოხსნა',
      pay_total: 'სულ', pay_save: 'შენახვა და დასრულება',
      pay_err_amount: 'შეიყვანეთ სწორი თანხა.', pay_err_same: 'აირჩიეთ ორი განსხვავებული მეთოდი.',
      paid_label: 'გადახდილი',
      day_total: 'დღის ნავაჭრი', cash_reg: 'სალარო (ნაღდი)', done_count: 'დასრულებული',
      rep_month: 'თვე', rep_total: 'თვის ნავაჭრი', rep_visits: 'დასრულებული ვიზიტი',
      rep_by_day: 'დღეების მიხედვით', rep_none: 'ამ თვეში დასრულებული ვიზიტი ჯერ არ არის.',
      rep_date: 'თარიღი', rep_count: 'ვიზიტი',
    },
    en: {
      panel: 'Admin panel',
      login_title: 'Sign in', login_email: 'Email', login_password: 'Password', login_btn: 'Sign in', login_err: 'Wrong email or password',
      loading: 'Loading…', logout: 'Sign out',
      tab_schedule: 'Schedule', tab_add: 'Add booking', tab_doctors: 'Doctors', tab_services: 'Services', tab_prices: 'Prices', tab_hours: 'Hours',
      price_from: 'From (₾)', price_to: 'To (₾)', category: 'Category', pcat_gen: 'General', pcat_cosm: 'Cosmetic', pcat_surg: 'Surgery/Prosth.', pcat_ortho: 'Orthodontics', pcat_kids: 'Kids',
      date: 'Date', doctor: 'Doctor', service: 'Service', time: 'Time', patient: 'Patient', phone: 'Phone', channel: 'Channel', note: 'Note', duration: 'Duration', action: 'Action',
      add_btn: 'Add booking', cancel: 'Cancel', cancel_confirm: 'Are you sure you want to cancel this booking?',
      ch_online: 'Online', ch_phone: 'Phone', ch_messenger: 'Messenger', ch_walkin: 'Walk-in',
      no_appts: 'No bookings on this day.', count_today: 'bookings this day', export: 'Export to Excel',
      active: 'Active', inactive: 'Inactive', remove: 'Delete', save: 'Save', add: 'Add', edit: 'Edit',
      role: 'Role', services_label: 'Services', duration_min: 'Duration (min)', name: 'Name',
      open: 'Open', close: 'Close', sat_close: 'Saturday close', step: 'Interval (min)', days: 'Working days',
      added_ok: 'Done ✓', slot_taken: 'That time is already taken — pick another.', fill_required: 'Please fill the required fields correctly.', save_err: 'Could not save — please try again.',
      pick_time: '— pick a time —', no_free: 'No free times',
      live_banner: 'Live mode — data is stored in the secure online database.',
      back_site: '← Site',
      tab_reports: 'Reports',
      complete: 'Complete', done_label: 'Completed', close_label: 'Close',
      pay_title: 'Finish the visit — payment',
      pay_amount: 'Amount (₾)', pay_method: 'Payment method', pay_ref: 'Service price',
      pm_tbc: 'TBC terminal', pm_bog: 'BoG terminal', pm_cash: 'Cash', pm_installment: 'Installment',
      pay_split: '+ Split payment (two methods)', pay_split_off: '− Remove second payment',
      pay_total: 'Total', pay_save: 'Save & complete',
      pay_err_amount: 'Enter a valid amount.', pay_err_same: 'Pick two different methods.',
      paid_label: 'Paid',
      day_total: 'Day takings', cash_reg: 'Cash register', done_count: 'completed',
      rep_month: 'Month', rep_total: 'Month takings', rep_visits: 'completed visits',
      rep_by_day: 'By day', rep_none: 'No completed visits this month yet.',
      rep_date: 'Date', rep_count: 'Visits',
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
  function doctorRole(d) { if (!d) return ''; if (d.roleKey && t(d.roleKey) !== d.roleKey) return t(d.roleKey); return (lang() === 'ka' ? d.role_ka : d.role_en) || ''; }
  function channelLabel(c) { return t('ch_' + (c || 'online')) || c; }
  function pad(n) { return String(n).padStart(2, '0'); }
  function isoToday() { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function endTime(a) { return D.toHHMM(D.toMin(a.time) + (a.durationMin || 30)); }

  /* ---------- payments helpers ---------- */
  const PAY_METHODS = ['tbc', 'bog', 'cash', 'installment'];
  function payMethodLabel(m) { return t('pm_' + m); }
  function paymentsOf(a) { return Array.isArray(a.payments) ? a.payments : []; }
  function gel(n) { return (Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-US'); }
  function methodTotals(list) {
    const by = { tbc: 0, bog: 0, cash: 0, installment: 0 };
    let total = 0;
    list.forEach(function (a) {
      paymentsOf(a).forEach(function (p) {
        const amt = Number(p.amount) || 0;
        total += amt;
        if (by[p.method] != null) by[p.method] += amt;
      });
    });
    return { by: by, total: total };
  }

  const state = {
    tab: 'schedule',
    dateISO: isoToday(),
    add: { doctorId: '', serviceId: '', dateISO: isoToday(), time: '', name: '', phone: '', channel: 'phone', note: '' },
    msg: '',
    pay: null, // { id, split, amt1, m1, amt2, m2, err } — open "finish visit" form
    repMonth: isoToday().slice(0, 7),
  };
  let root = null;
  let loaded = false;

  /* ---------- auth (Supabase) ---------- */
  function authed() { return !!(window.SB && window.SB.isAuthed()); }
  async function ensureLoaded(force) { if (loaded && !force) return; await D.load(); loaded = true; }

  function renderLogin(err) {
    root.innerHTML = `<div class="adm-login">
      <div class="adm-login-card">
        <span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28"><path fill="currentColor" d="M12 2C8.5 2 7 4 4.8 4 3 4 2 5.5 2 8c0 3 1 5 1.8 8.5.5 2.2 1 4.5 2.2 4.5 1.3 0 1.4-2.5 2-4.5.4-1.4.9-2.5 2-2.5s1.6 1.1 2 2.5c.6 2 .7 4.5 2 4.5 1.2 0 1.7-2.3 2.2-4.5C21.9 13 23 11 23 8c0-2.5-1-4-2.8-4C18 4 16.5 2 12 2z"/></svg></span>
        <h1>Dental Clinic GT</h1>
        <p class="adm-sub">${esc(t('panel'))}</p>
        <div class="field"><label for="adm-email">${esc(t('login_email'))}</label>
          <input id="adm-email" type="email" data-field="email" autocomplete="username" /></div>
        <div class="field"><label for="adm-pass">${esc(t('login_password'))}</label>
          <input id="adm-pass" type="password" data-field="pass" autocomplete="current-password" /></div>
        ${err ? `<p class="adm-err">${esc(t('login_err'))}</p>` : ''}
        <button type="button" class="btn btn-primary btn-block" data-act="login">${esc(t('login_btn'))}</button>
        <a href="index.html" class="adm-back">${esc(t('back_site'))}</a>
      </div></div>`;
    const inp = root.querySelector('#adm-pass');
    if (inp) inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryLogin(); });
  }
  function renderLoading() {
    root.innerHTML = `<div class="adm-login"><div class="adm-login-card"><p class="adm-sub">${esc(t('loading'))}</p></div></div>`;
  }
  async function tryLogin() {
    const email = ((root.querySelector('#adm-email') || {}).value || '').trim();
    const pass = (root.querySelector('#adm-pass') || {}).value || '';
    renderLoading();
    try {
      await window.SB.signIn(email, pass);
      await ensureLoaded(true);
      render();
    } catch (e) { renderLogin(true); }
  }
  async function doLogout() {
    try { await window.SB.signOut(); } catch (e) {}
    loaded = false; state.msg = '';
    renderLogin(false);
  }

  /* ---------- shell ---------- */
  function renderShell(inner) {
    const tabs = ['schedule', 'add', 'doctors', 'services', 'hours', 'reports'];
    return `<header class="adm-topbar">
      <div class="adm-brand"><span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M12 2C8.5 2 7 4 4.8 4 3 4 2 5.5 2 8c0 3 1 5 1.8 8.5.5 2.2 1 4.5 2.2 4.5 1.3 0 1.4-2.5 2-4.5.4-1.4.9-2.5 2-2.5s1.6 1.1 2 2.5c.6 2 .7 4.5 2 4.5 1.2 0 1.7-2.3 2.2-4.5C21.9 13 23 11 23 8c0-2.5-1-4-2.8-4C18 4 16.5 2 12 2z"/></svg></span>
        <strong>Dental Clinic GT</strong><span class="adm-tag">${esc(t('panel'))}</span></div>
      <div class="adm-top-actions">
        <button class="lang-toggle" data-act="lang" type="button"><span>${lang() === 'ka' ? 'EN' : 'ქარ'}</span></button>
        <a href="index.html" class="btn btn-ghost btn-sm">${esc(t('back_site'))}</a>
        <button class="btn btn-ghost btn-sm" data-act="logout" type="button">${esc(t('logout'))}</button>
      </div>
    </header>
    <p class="adm-demo">${esc(t('live_banner'))}</p>
    <nav class="adm-tabs">${tabs.map((tb) => `<button type="button" class="adm-tab${state.tab === tb ? ' is-active' : ''}" data-act="tab" data-id="${tb}">${esc(t('tab_' + tb))}</button>`).join('')}</nav>
    ${state.msg ? `<p class="adm-msg">${esc(state.msg)}</p>` : ''}
    <div class="adm-body">${inner}</div>`;
  }

  /* ---------- tab: schedule ---------- */
  function renderSchedule() {
    const all = D.listAppointments({ dateISO: state.dateISO });
    // Show a column for every active doctor, PLUS any doctor who has a booking that day
    // (e.g. an inactive doctor) so the count always matches what is shown.
    const activeDocs = D.getDoctors();
    const shownIds = {};
    activeDocs.forEach((d) => { shownIds[d.id] = true; });
    const extra = D.getAllDoctors().filter((d) => !shownIds[d.id] && all.some((a) => a.doctorId === d.id));
    const docs = activeDocs.concat(extra);

    const head = `<div class="adm-controls">
      <div class="field"><label for="adm-date">${esc(t('date'))}</label><input id="adm-date" type="date" data-field="schedDate" value="${esc(state.dateISO)}" /></div>
      <span class="adm-count">${all.length} ${esc(t('count_today'))}</span>
      <button type="button" class="btn btn-ghost btn-sm" data-act="export">${esc(t('export'))} ⬇</button>
    </div>`;
    if (!all.length) return head + `<p class="adm-empty">${esc(t('no_appts'))}</p>`;

    // End-of-day takings for the selected date, split by payment method
    const doneList = all.filter((a) => a.status === 'done');
    const mt = methodTotals(doneList);
    const kpis = `<div class="adm-kpis">
      <div class="adm-kpi adm-kpi-main"><small>${esc(t('day_total'))}</small><strong>${gel(mt.total)} ₾</strong><span>${doneList.length}/${all.length} ${esc(t('done_count'))}</span></div>
      <div class="adm-kpi"><small>${esc(payMethodLabel('tbc'))}</small><strong>${gel(mt.by.tbc)} ₾</strong></div>
      <div class="adm-kpi"><small>${esc(payMethodLabel('bog'))}</small><strong>${gel(mt.by.bog)} ₾</strong></div>
      <div class="adm-kpi"><small>${esc(t('cash_reg'))}</small><strong>${gel(mt.by.cash)} ₾</strong></div>
      <div class="adm-kpi"><small>${esc(payMethodLabel('installment'))}</small><strong>${gel(mt.by.installment)} ₾</strong></div>
    </div>`;

    const cols = docs.map((doc) => {
      const list = all.filter((a) => a.doctorId === doc.id);
      const rows = list.length ? list.map((a) => {
        const s = D.getAllServices().find((x) => x.id === a.serviceId);
        const isDone = a.status === 'done';
        const pays = paymentsOf(a);
        const paidLine = isDone
          ? `<em class="adm-paid">✓ ${esc(t('done_label'))}${pays.length ? ` · ${gel(methodTotals([a]).total)} ₾ · ${esc(pays.map((p) => payMethodLabel(p.method)).join(' + '))}` : ''}</em>`
          : '';
        const btns = isDone ? '' : `<div class="adm-appt-btns">
              <button type="button" class="adm-done-btn" data-act="payOpen" data-id="${esc(a.id)}">✓ ${esc(t('complete'))}</button>
              <button type="button" class="adm-x" data-act="cancel" data-id="${esc(a.id)}" title="${esc(t('cancel'))}">✕</button>
            </div>`;
        const payform = (state.pay && String(state.pay.id) === String(a.id)) ? renderPayForm(a, s) : '';
        return `<div class="adm-appt${isDone ? ' is-done' : ''}">
          <div class="adm-appt-time">${esc(a.time)}–${esc(endTime(a))}<small>${a.durationMin}${esc(t('min') || 'min')}</small></div>
          <div class="adm-appt-main">
            <strong>${esc(serviceName(s))}</strong>
            <span>${esc(a.patientName)} · <a href="tel:${esc(a.patientPhone)}">${esc(a.patientPhone)}</a></span>
            ${a.note ? `<em>${esc(a.note)}</em>` : ''}
            ${paidLine}
          </div>
          <span class="adm-chan chan-${esc(a.channel)}">${esc(channelLabel(a.channel))}</span>
          ${btns}
        </div>${payform}`;
      }).join('') : `<p class="adm-empty sm">${esc(t('no_appts'))}</p>`;
      return `<section class="adm-doc-col"><h3>${esc(doc.name)} <small>${esc(doctorRole(doc))}</small></h3>${rows}</section>`;
    }).join('');
    return head + kpis + `<div class="adm-sched">${cols}</div>`;
  }

  /* ---------- finish-visit payment form ---------- */
  function payRowHtml(n, method, amount) {
    return `<div class="adm-pay-row">
      <select data-pay="m${n}" aria-label="${esc(t('pay_method'))}">${PAY_METHODS.map((m) => `<option value="${m}"${m === method ? ' selected' : ''}>${esc(payMethodLabel(m))}</option>`).join('')}</select>
      <input type="number" data-pay="amt${n}" min="0" step="0.01" inputmode="decimal" placeholder="0" value="${esc(amount)}" aria-label="${esc(t('pay_amount'))}" />
    </div>`;
  }
  function renderPayForm(a, s) {
    const p = state.pay;
    const ref = s && (s.priceFrom || s.priceTo) ? `${gel(s.priceFrom || 0)}–${gel(s.priceTo || 0)} ₾` : '';
    const total = (parseFloat(p.amt1) || 0) + (p.split ? (parseFloat(p.amt2) || 0) : 0);
    return `<div class="adm-payform">
      <h4>${esc(t('pay_title'))}</h4>
      ${ref ? `<p class="adm-pay-ref">${esc(t('pay_ref'))}: ${esc(ref)}</p>` : ''}
      ${payRowHtml(1, p.m1, p.amt1)}
      ${p.split ? payRowHtml(2, p.m2, p.amt2) : ''}
      <button type="button" class="adm-pay-split" data-act="paySplit">${esc(p.split ? t('pay_split_off') : t('pay_split'))}</button>
      <p class="adm-pay-total">${esc(t('pay_total'))}: <strong id="payTotal">${gel(total)} ₾</strong></p>
      ${p.err ? `<p class="adm-err">${esc(p.err)}</p>` : ''}
      <div class="adm-pay-actions">
        <button type="button" class="btn btn-primary btn-sm" data-act="payDone" data-id="${esc(a.id)}">${esc(t('pay_save'))}</button>
        <button type="button" class="btn btn-ghost btn-sm" data-act="payClose">${esc(t('close_label'))}</button>
      </div>
    </div>`;
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
      <td data-label="${esc(t('name'))}"><span class="adm-cell-stack"><strong>${esc(d.name)}</strong><small>${esc(doctorRole(d))}</small></span></td>
      <td data-label="${esc(t('services_label'))}">${d.services.map((sid) => { const s = services.find((x) => x.id === sid); return `<span class="adm-pill">${esc(serviceName(s))}</span>`; }).join(' ')}</td>
      <td data-label="${esc(t('active'))}"><button type="button" class="adm-toggle${d.active ? ' on' : ''}" data-act="docActive" data-id="${esc(d.id)}">${esc(d.active ? t('active') : t('inactive'))}</button></td>
      <td data-label="${esc(t('action'))}"><button type="button" class="adm-x" data-act="docDelete" data-id="${esc(d.id)}">${esc(t('remove'))}</button></td>
    </tr>`).join('');
    const svcChecks = services.map((s) => `<label class="adm-check"><input type="checkbox" data-newdoc-svc="${s.id}" /> ${esc(serviceName(s))}</label>`).join('');
    return `<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>${esc(t('name'))}</th><th>${esc(t('services_label'))}</th><th>${esc(t('active'))}</th><th>${esc(t('action'))}</th></tr></thead><tbody>${rows}</tbody></table></div>
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
      <td data-label="${esc(t('service'))}"><strong>${esc(serviceName(s))}</strong></td>
      <td data-label="${esc(t('duration_min'))}"><input type="number" class="adm-num" min="10" max="240" step="5" value="${s.dur}" data-svc-dur="${s.id}" /> ${esc(t('min') || 'min')}</td>
      <td data-label="${esc(t('price_from'))}"><input type="number" class="adm-num" min="0" step="10" value="${s.priceFrom || 0}" data-svc-from="${s.id}" /></td>
      <td data-label="${esc(t('price_to'))}"><input type="number" class="adm-num" min="0" step="10" value="${s.priceTo || 0}" data-svc-to="${s.id}" /></td>
      <td data-label="${esc(t('active'))}"><button type="button" class="adm-toggle${s.active ? ' on' : ''}" data-act="svcActive" data-id="${esc(s.id)}">${esc(s.active ? t('active') : t('inactive'))}</button></td>
      <td data-label="${esc(t('action'))}"><button type="button" class="btn btn-ghost btn-sm" data-act="svcSave" data-id="${esc(s.id)}">${esc(t('save'))}</button></td>
    </tr>`).join('');
    return `<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>${esc(t('service'))}</th><th>${esc(t('duration_min'))}</th><th>${esc(t('price_from'))}</th><th>${esc(t('price_to'))}</th><th>${esc(t('active'))}</th><th>${esc(t('action'))}</th></tr></thead><tbody>${rows}</tbody></table></div>
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
        <div class="field"><label>${esc(t('step'))}</label><input type="number" id="h-step" value="${h.stepMin}" min="10" max="60" step="5" disabled /></div>
      </div>
      <div class="field"><label>${esc(t('days'))}</label><div class="adm-checks">${days}</div></div>
      <button type="button" class="btn btn-primary" data-act="hoursSave">${esc(t('save'))}</button>
    </div>`;
  }

  /* ---------- tab: monthly report ---------- */
  function renderReports() {
    const month = state.repMonth || isoToday().slice(0, 7);
    const done = D.listAppointments({}).filter((a) => a.status === 'done' && a.dateISO.slice(0, 7) === month);
    const mt = methodTotals(done);
    const head = `<div class="adm-controls">
      <div class="field"><label for="rep-month">${esc(t('rep_month'))}</label><input id="rep-month" type="month" data-field="repMonth" value="${esc(month)}" /></div>
      <button type="button" class="btn btn-ghost btn-sm" data-act="exportReport">${esc(t('export'))} ⬇</button>
    </div>`;
    const kpis = `<div class="adm-kpis">
      <div class="adm-kpi adm-kpi-main"><small>${esc(t('rep_total'))}</small><strong>${gel(mt.total)} ₾</strong><span>${done.length} ${esc(t('rep_visits'))}</span></div>
      <div class="adm-kpi"><small>${esc(payMethodLabel('tbc'))}</small><strong>${gel(mt.by.tbc)} ₾</strong></div>
      <div class="adm-kpi"><small>${esc(payMethodLabel('bog'))}</small><strong>${gel(mt.by.bog)} ₾</strong></div>
      <div class="adm-kpi"><small>${esc(t('cash_reg'))}</small><strong>${gel(mt.by.cash)} ₾</strong></div>
      <div class="adm-kpi"><small>${esc(payMethodLabel('installment'))}</small><strong>${gel(mt.by.installment)} ₾</strong></div>
    </div>`;
    if (!done.length) return head + kpis + `<p class="adm-empty">${esc(t('rep_none'))}</p>`;
    const byDay = {};
    done.forEach((a) => { (byDay[a.dateISO] = byDay[a.dateISO] || []).push(a); });
    const rows = Object.keys(byDay).sort().map((d) => {
      const r = methodTotals(byDay[d]);
      return `<tr>
        <td data-label="${esc(t('rep_date'))}"><strong>${esc(d)}</strong></td>
        <td data-label="${esc(t('rep_count'))}">${byDay[d].length}</td>
        <td data-label="${esc(t('pay_total'))}"><strong>${gel(r.total)} ₾</strong></td>
        <td data-label="${esc(payMethodLabel('tbc'))}">${gel(r.by.tbc)}</td>
        <td data-label="${esc(payMethodLabel('bog'))}">${gel(r.by.bog)}</td>
        <td data-label="${esc(payMethodLabel('cash'))}">${gel(r.by.cash)}</td>
        <td data-label="${esc(payMethodLabel('installment'))}">${gel(r.by.installment)}</td>
      </tr>`;
    }).join('');
    return head + kpis + `<h3 class="adm-rep-h">${esc(t('rep_by_day'))}</h3>
      <div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>${esc(t('rep_date'))}</th><th>${esc(t('rep_count'))}</th><th>${esc(t('pay_total'))}</th><th>${esc(payMethodLabel('tbc'))}</th><th>${esc(payMethodLabel('bog'))}</th><th>${esc(payMethodLabel('cash'))}</th><th>${esc(payMethodLabel('installment'))}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
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
    else if (state.tab === 'reports') inner = renderReports();
    root.innerHTML = renderShell(inner);
    // The tab strip scrolls horizontally on phones and is rebuilt on every render —
    // bring the active tab back into view so it never gets "lost" off-screen.
    const activeTab = root.querySelector('.adm-tab.is-active');
    if (activeTab && activeTab.scrollIntoView) activeTab.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }

  /* ---------- export to CSV (opens in Excel) ---------- */
  function csvCell(v) { v = (v == null ? '' : String(v)); return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function downloadCSV(lines, filename) {
    const csv = '﻿' + lines.map((r) => r.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  function exportCSV() {
    const rows = D.listAppointments({});
    const header = [t('date'), t('time'), t('doctor'), t('service'), t('patient'), t('phone'), 'Email', t('channel'), t('note'), 'Status', t('paid_label') + ' (GEL)', t('pay_method')];
    const docName = (id) => { const d = D.getDoctor(id); return d ? d.name : ''; };
    const svcName = (id) => { const s = D.getAllServices().find((x) => x.id === id); return s ? serviceName(s) : ''; };
    const lines = [header].concat(rows.map((a) => [
      a.dateISO, a.time, docName(a.doctorId), svcName(a.serviceId), a.patientName, a.patientPhone, a.patientEmail || '', channelLabel(a.channel), a.note || '',
      a.status || 'booked',
      paymentsOf(a).length ? methodTotals([a]).total : '',
      paymentsOf(a).map((p) => payMethodLabel(p.method) + ' ' + gel(p.amount)).join(' + '),
    ]));
    downloadCSV(lines, 'dental-clinic-bookings-' + isoToday() + '.csv');
  }
  function exportReportCSV() {
    const month = state.repMonth || isoToday().slice(0, 7);
    const done = D.listAppointments({}).filter((a) => a.status === 'done' && a.dateISO.slice(0, 7) === month);
    const byDay = {};
    done.forEach((a) => { (byDay[a.dateISO] = byDay[a.dateISO] || []).push(a); });
    const header = [t('rep_date'), t('rep_count'), t('pay_total') + ' (GEL)', payMethodLabel('tbc'), payMethodLabel('bog'), payMethodLabel('cash'), payMethodLabel('installment')];
    const lines = [header];
    Object.keys(byDay).sort().forEach((d) => {
      const r = methodTotals(byDay[d]);
      lines.push([d, byDay[d].length, r.total, r.by.tbc, r.by.bog, r.by.cash, r.by.installment]);
    });
    const mt = methodTotals(done);
    lines.push([t('pay_total'), done.length, mt.total, mt.by.tbc, mt.by.bog, mt.by.cash, mt.by.installment]);
    downloadCSV(lines, 'dental-clinic-report-' + month + '.csv');
  }

  /* ---------- async write helpers ---------- */
  async function doCancel(id) { await D.cancelAppointment(id); render(); }
  function openPayForm(id) {
    const a = D.listAppointments({}).find((x) => String(x.id) === String(id));
    if (!a) return;
    const s = D.getAllServices().find((x) => x.id === a.serviceId);
    // Pre-fill the amount when the service has one fixed price; otherwise staff types it.
    const pre = (s && s.priceFrom && s.priceFrom === s.priceTo) ? String(s.priceFrom) : '';
    state.pay = { id: id, split: false, amt1: pre, m1: 'tbc', amt2: '', m2: 'cash', err: '' };
    render();
  }
  async function completeWithPayment(id) {
    const p = state.pay;
    if (!p || String(p.id) !== String(id)) return;
    const a1 = parseFloat(p.amt1);
    if (!isFinite(a1) || a1 <= 0) { p.err = t('pay_err_amount'); return render(); }
    const pays = [{ method: p.m1, amount: Math.round(a1 * 100) / 100 }];
    if (p.split) {
      const a2 = parseFloat(p.amt2);
      if (!isFinite(a2) || a2 <= 0) { p.err = t('pay_err_amount'); return render(); }
      if (p.m2 === p.m1) { p.err = t('pay_err_same'); return render(); }
      pays.push({ method: p.m2, amount: Math.round(a2 * 100) / 100 });
    }
    const ok = await D.completeAppointment(id, pays);
    if (ok) { state.pay = null; state.msg = t('added_ok'); }
    else { p.err = t('save_err'); }
    render();
  }
  async function addAppointment() {
    const a = state.add;
    if (!a.doctorId || !a.serviceId || !a.time || a.name.trim().length < 2 || !/^\+?[0-9\s\-()]{6,20}$/.test(a.phone)) {
      state.msg = t('fill_required'); render(); return;
    }
    const res = await D.createAppointment({
      doctorId: a.doctorId, serviceId: a.serviceId, dateISO: a.dateISO, time: a.time,
      patientName: a.name, patientPhone: a.phone, note: a.note, channel: a.channel,
    });
    if (res.ok) {
      state.add = { doctorId: '', serviceId: '', dateISO: a.dateISO, time: '', name: '', phone: '', channel: a.channel, note: '' };
      state.msg = t('added_ok'); state.tab = 'schedule'; state.dateISO = a.dateISO; render();
    } else { state.msg = res.reason === 'taken' ? t('slot_taken') : (res.reason === 'error' ? t('save_err') : t('fill_required')); render(); }
  }
  async function toggleDocActive(id) { const d = D.getDoctor(id); if (d) { await D.upsertDoctor({ id: id, active: !d.active }); render(); } }
  async function deleteDoc(id) { await D.removeDoctor(id); render(); }
  async function addDoctor() {
    const name = (root.querySelector('#newdoc-name') || {}).value || '';
    const role = (root.querySelector('#newdoc-role') || {}).value || '';
    if (name.trim().length < 2) { state.msg = t('fill_required'); return render(); }
    const services = Array.from(root.querySelectorAll('[data-newdoc-svc]:checked')).map((c) => c.getAttribute('data-newdoc-svc'));
    try { await D.upsertDoctor({ name: name.trim(), role_ka: role, role_en: role, services: services, active: true }); state.msg = t('added_ok'); }
    catch (e) { state.msg = t('save_err'); }
    render();
  }
  async function toggleSvcActive(id) { const s = D.getAllServices().find((x) => x.id === id); if (s) { await D.upsertService({ id: id, active: !s.active }); render(); } }
  async function saveSvc(id) {
    const dur = root.querySelector(`[data-svc-dur="${id}"]`);
    const pf = root.querySelector(`[data-svc-from="${id}"]`);
    const pt = root.querySelector(`[data-svc-to="${id}"]`);
    try { await D.upsertService({ id: id, dur: parseInt(dur && dur.value, 10) || 30, priceFrom: parseInt(pf && pf.value, 10) || 0, priceTo: parseInt(pt && pt.value, 10) || 0 }); state.msg = t('added_ok'); }
    catch (e) { state.msg = t('save_err'); }
    render();
  }
  async function addService() {
    const ka = (root.querySelector('#newsvc-ka') || {}).value || '';
    const en = (root.querySelector('#newsvc-en') || {}).value || '';
    const dur = parseInt((root.querySelector('#newsvc-dur') || {}).value, 10) || 30;
    const pf = parseInt((root.querySelector('#newsvc-from') || {}).value, 10) || 0;
    const pt = parseInt((root.querySelector('#newsvc-to') || {}).value, 10) || 0;
    if (ka.trim().length < 2 && en.trim().length < 2) { state.msg = t('fill_required'); return render(); }
    try { await D.upsertService({ name_ka: ka.trim() || en.trim(), name_en: en.trim() || ka.trim(), dur: dur, priceFrom: pf, priceTo: pt, active: true }); state.msg = t('added_ok'); }
    catch (e) { state.msg = t('save_err'); }
    render();
  }
  async function saveHours() {
    const toMinV = (v) => { const p = (v || '').split(':').map(Number); return (p[0] || 0) * 60 + (p[1] || 0); };
    const days = Array.from(root.querySelectorAll('[data-hours-day]:checked')).map((c) => parseInt(c.getAttribute('data-hours-day'), 10));
    try {
      await D.setHours({
        openMin: toMinV((root.querySelector('#h-open') || {}).value),
        closeMin: toMinV((root.querySelector('#h-close') || {}).value),
        satCloseMin: toMinV((root.querySelector('#h-sat') || {}).value),
        days: days,
      });
      state.msg = t('added_ok');
    } catch (e) { state.msg = t('save_err'); }
    render();
  }

  /* ---------- interactions ---------- */
  function onClick(e) {
    const btn = e.target.closest('[data-act]'); if (!btn) return;
    const act = btn.getAttribute('data-act'); const id = btn.getAttribute('data-id');
    if (act === 'login') return tryLogin();
    if (act === 'logout') return doLogout();
    if (act === 'lang') { const next = lang() === 'ka' ? 'en' : 'ka'; if (typeof applyLang === 'function') applyLang(next); else document.documentElement.lang = next; render(); return; }
    if (act === 'tab') { state.tab = id; state.msg = ''; state.pay = null; return render(); }
    if (act === 'export') return exportCSV();
    if (act === 'exportReport') return exportReportCSV();
    if (act === 'payOpen') return openPayForm(id);
    if (act === 'payClose') { state.pay = null; return render(); }
    if (act === 'paySplit') { if (state.pay) { state.pay.split = !state.pay.split; state.pay.err = ''; } return render(); }
    if (act === 'payDone') return completeWithPayment(id);
    if (act === 'cancel') { if (window.confirm(t('cancel_confirm'))) doCancel(id); return; }
    if (act === 'addAppt') return addAppointment();
    if (act === 'docActive') return toggleDocActive(id);
    if (act === 'docDelete') { if (window.confirm(t('cancel_confirm'))) deleteDoc(id); return; }
    if (act === 'docAdd') return addDoctor();
    if (act === 'svcActive') return toggleSvcActive(id);
    if (act === 'svcSave') return saveSvc(id);
    if (act === 'svcAdd') return addService();
    if (act === 'hoursSave') return saveHours();
  }

  function onInput(e) {
    // Payment form fields: update state + the live total, without a full re-render
    // (a re-render would steal focus from the amount input mid-typing).
    const pf = e.target.getAttribute && e.target.getAttribute('data-pay');
    if (pf && state.pay) {
      if (pf === 'amt1' || pf === 'amt2' || pf === 'm1' || pf === 'm2') state.pay[pf] = e.target.value;
      const total = (parseFloat(state.pay.amt1) || 0) + (state.pay.split ? (parseFloat(state.pay.amt2) || 0) : 0);
      const el = root.querySelector('#payTotal');
      if (el) el.textContent = gel(total) + ' ₾';
      return;
    }
    const f = e.target.getAttribute && e.target.getAttribute('data-field');
    if (!f) return;
    if (f === 'schedDate') { state.dateISO = e.target.value; state.pay = null; render(); return; }
    if (f === 'repMonth') { if (/^\d{4}-\d{2}$/.test(e.target.value)) { state.repMonth = e.target.value; render(); } return; }
    if (f === 'doctorId') { state.add.doctorId = e.target.value; state.add.serviceId = ''; state.add.time = ''; render(); return; }
    if (f === 'serviceId') { state.add.serviceId = e.target.value; state.add.time = ''; render(); return; }
    if (f === 'addDate') { state.add.dateISO = e.target.value; state.add.time = ''; render(); return; }
    if (f === 'time') { state.add.time = e.target.value; return; }
    if (['name', 'phone', 'note', 'channel'].includes(f)) { state.add[f] = e.target.value; return; }
  }

  /* ---------- init ---------- */
  async function init() {
    root = document.getElementById('adminApp');
    if (!root || !D) return;
    root.addEventListener('click', onClick);
    root.addEventListener('input', onInput);
    window.onLangChange = render;
    if (authed()) {
      renderLoading();
      try { await ensureLoaded(true); render(); }
      catch (e) { await doLogout(); }
    } else {
      renderLogin(false);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
