/* ============================================================
   Dental Clinic GT — Transparent price estimator
   Lists prices (always visible) AND lets a visitor pick procedures to
   get an instant total range + installment estimate, then print a quote.
   Reads prices from ClinicData (data.js) — editable in the admin panel.
   ============================================================ */
'use strict';

(function () {
  const D = window.ClinicData;
  const CUR = '₾';
  const MONTHS = 12;
  const CAT_ORDER = ['gen', 'cosm', 'surg', 'ortho', 'kids'];

  const P_I18N = {
    ka: {
      eyebrow: 'ფასები', title: 'გამჭვირვალე ფასები', sub: 'აირჩიეთ პროცედურები და მაშინვე ნახეთ სავარაუდო თანხა და განვადება.',
      cat_gen: 'ზოგადი მკურნალობა', cat_cosm: 'ესთეტიკა და გათეთრება', cat_surg: 'ქირურგია და პროთეზირება', cat_ortho: 'ორთოდონტია', cat_kids: 'ბავშვები',
      estimate: 'თქვენი ფასის შეფასება', select_hint: 'მონიშნეთ პროცედურები მარცხნივ — ჯამს აქ დაინახავთ.',
      total: 'სავარაუდო ჯამი', installment: 'განვადება', per_month: '₾/თვე', months_note: '12 თვემდე განვადებით',
      selected: 'არჩეული', book_consult: 'კონსულტაციის დაჯავშნა', print: 'ფასის ბეჭდვა',
      add: 'დამატება', added: 'დამატებულია',
      disclaimer: '* ფასები სავარაუდოა და დამოკიდებულია მასალასა და შემთხვევის სირთულეზე. ზუსტ ფასს ექიმი კონსულტაციაზე დაგიდასტურებთ.',
      from_free: 'უფასო',
    },
    en: {
      eyebrow: 'Pricing', title: 'Transparent prices', sub: 'Pick the procedures you need and instantly see an estimated total and installment plan.',
      cat_gen: 'General treatment', cat_cosm: 'Cosmetic & whitening', cat_surg: 'Surgery & prosthetics', cat_ortho: 'Orthodontics', cat_kids: 'Kids',
      estimate: 'Your estimate', select_hint: 'Tick the procedures on the left — your total appears here.',
      total: 'Estimated total', installment: 'Installment', per_month: '₾/mo', months_note: 'up to 12 monthly payments',
      selected: 'selected', book_consult: 'Book a consultation', print: 'Print estimate',
      add: 'Add', added: 'Added',
      disclaimer: '* Prices are indicative and depend on materials and case complexity. Your exact price is confirmed by the doctor at the consultation.',
      from_free: 'Free',
    },
  };

  function lang() { return document.documentElement.lang || 'ka'; }
  function t(key) {
    const L = lang(); const m = P_I18N[L] || {};
    const main = (typeof I18N !== 'undefined' && I18N[L]) || {};
    return m[key] || main[key] || P_I18N.ka[key] || key;
  }
  function itemName(it) { return lang() === 'ka' ? it.name_ka : it.name_en; }
  function itemNote(it) { return lang() === 'ka' ? it.note_ka : it.note_en; }
  function fmt(n) { return Number(n).toLocaleString('en-US'); }
  function priceLabel(it) { return (it.from === 0 ? t('from_free') : fmt(it.from)) + '–' + fmt(it.to) + ' ' + CUR; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  const selected = new Set();
  let root = null;

  function render() {
    if (!root) return;
    const items = D.getPriceItems();
    const byCat = {};
    items.forEach((it) => { (byCat[it.cat] = byCat[it.cat] || []).push(it); });

    const list = CAT_ORDER.filter((c) => byCat[c]).map((c) => `
      <div class="price-group">
        <h3 class="price-cat">${esc(t('cat_' + c))}</h3>
        ${byCat[c].map((it) => {
          const on = selected.has(it.id);
          const note = itemNote(it);
          return `<button type="button" class="price-row${on ? ' is-on' : ''}" data-act="toggle" data-id="${esc(it.id)}" aria-pressed="${on}">
            <span class="price-check" aria-hidden="true">${on ? '✓' : '+'}</span>
            <span class="price-name">${esc(itemName(it))}${note ? `<small>${esc(note)}</small>` : ''}</span>
            <span class="price-val">${esc(priceLabel(it))}</span>
          </button>`;
        }).join('')}
      </div>`).join('');

    const chosen = items.filter((it) => selected.has(it.id));
    let from = 0, to = 0; chosen.forEach((it) => { from += it.from; to += it.to; });
    const hasSel = chosen.length > 0;
    const summary = `
      <div class="price-summary-card">
        <h3>${esc(t('estimate'))}</h3>
        ${!hasSel ? `<p class="price-hint">${esc(t('select_hint'))}</p>` : `
          <ul class="price-chosen">${chosen.map((it) => `<li><span>${esc(itemName(it))}</span><span>${esc(priceLabel(it))}</span></li>`).join('')}</ul>
          <div class="price-total"><span>${esc(t('total'))}</span><strong>${fmt(from)}–${fmt(to)} ${CUR}</strong></div>
          <div class="price-instal"><span>${esc(t('installment'))}</span><strong>≈ ${fmt(Math.round(from / MONTHS))}–${fmt(Math.round(to / MONTHS))} ${esc(t('per_month'))}</strong><small>${esc(t('months_note'))}</small></div>
        `}
        <a href="booking.html" class="btn btn-primary btn-block" data-i18n="cta_book_online">${esc(t('book_consult'))}</a>
        <button type="button" class="btn btn-ghost btn-block" data-act="print"${hasSel ? '' : ' disabled'}>${esc(t('print'))}</button>
        <span class="price-count">${chosen.length} ${esc(t('selected'))}</span>
      </div>`;

    root.innerHTML = `
      <header class="section-head reveal in">
        <p class="eyebrow center"><span>${esc(t('eyebrow'))}</span></p>
        <h2>${esc(t('title'))}</h2>
        <p class="section-sub">${esc(t('sub'))}</p>
      </header>
      <div class="price-grid">
        <div class="price-list">${list}</div>
        <aside class="price-side">${summary}</aside>
      </div>
      <p class="price-disclaimer">${esc(t('disclaimer'))}</p>`;
  }

  function onClick(e) {
    const btn = e.target.closest('[data-act]'); if (!btn) return;
    const act = btn.getAttribute('data-act');
    if (act === 'toggle') {
      const id = btn.getAttribute('data-id');
      if (selected.has(id)) selected.delete(id); else selected.add(id);
      render();
    } else if (act === 'print') {
      window.print();
    }
  }

  function init() {
    root = document.getElementById('pricingApp');
    if (!root || !D) return;
    root.addEventListener('click', onClick);
    const prev = window.onLangChange;
    window.onLangChange = function (l) { if (typeof prev === 'function') prev(l); render(); };
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
