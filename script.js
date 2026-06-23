/* ============================================================
   Dental Clinic GT — Interactions
   - Bilingual (KA / EN) text switching
   - Mobile navigation
   - Sticky header, scroll reveal, stat counters
   - Form validation + success state
   - Back-to-top
   No external dependencies. CSP-friendly (no inline handlers).
   ============================================================ */
'use strict';

/* ------------------------------------------------------------
   1. TRANSLATIONS
   To edit any text on the site, change the values below.
   Each key has a Georgian (ka) and English (en) version.
------------------------------------------------------------ */
const I18N = {
  ka: {
    meta_description: 'Dental Clinic GT — თანამედროვე სტომატოლოგიური კლინიკა თბილისში. უმტკივნეულო მკურნალობა, იმპლანტაცია, ორთოდონტია და ესთეტიკა.',
    skip_to_content: 'გადასვლა მთავარ შინაარსზე',

    nav_services: 'სერვისები',
    nav_pricing: 'ფასები',
    nav_about: 'რატომ ჩვენ',
    nav_team: 'ექიმები',
    nav_reviews: 'შეფასებები',
    nav_faq: 'კითხვები',
    nav_contact: 'კონტაქტი',
    cta_book: 'ვიზიტის დაჯავშნა',
    cta_call: 'დარეკვა',
    lang_toggle_aria: 'ენის შეცვლა ინგლისურზე',
    menu_aria: 'მენიუს გახსნა',

    hero_eyebrow: 'თანამედროვე სტომატოლოგია თბილისში',
    hero_title: 'თქვენი ღიმილი ჩვენი ზრუნვის ცენტრშია',
    hero_subtitle: 'უმტკივნეულო მკურნალობა, თანამედროვე ტექნოლოგიები და გამოცდილი ექიმები — ერთ სივრცეში.',
    hero_trust_1: 'სერტიფიცირებული ექიმები',
    hero_trust_2: 'სტერილური გარემო',
    hero_trust_3: 'გამჭვირვალე ფასები',
    hero_img_alt: 'ღიმილიანი პაციენტი სტომატოლოგიურ კლინიკაში',
    img_hint: 'ფოტოს ადგილი — ჩაანაცვლეთ რეალურით',
    float_rating: 'პაციენტთა შეფასება',
    float_avail_title: 'ხელმისაწვდომია დღეს',
    float_avail_sub: 'დაჯავშნეთ ვიზიტი ახლავე',

    stat_years: 'წლიანი გამოცდილება',
    stat_patients: 'კმაყოფილი პაციენტი',
    stat_doctors: 'ექიმი და სპეციალისტი',
    stat_rating: 'საშუალო შეფასება',

    services_eyebrow: 'ჩვენი სერვისები',
    services_title: 'სრული სტომატოლოგიური მომსახურება',
    services_sub: 'პროფილაქტიკიდან რთულ მკურნალობამდე — ყველაფერი ერთ კლინიკაში.',
    srv1_title: 'ზოგადი სტომატოლოგია',
    srv1_desc: 'კარიესის მკურნალობა, ბჟენი, პროფესიული წმენდა და პროფილაქტიკა.',
    srv2_title: 'იმპლანტაცია',
    srv2_desc: 'დაკარგული კბილის აღდგენა მყარი და ბუნებრივი იმპლანტებით.',
    srv3_title: 'ორთოდონტია',
    srv3_desc: 'ბრეკეტები და გამჭვირვალე ელაინერები სწორი ღიმილისთვის.',
    srv4_title: 'ესთეტიკა და გათეთრება',
    srv4_desc: 'კბილების გათეთრება და ვინირები ბრწყინვალე ღიმილისთვის.',
    srv5_title: 'ბავშვთა სტომატოლოგია',
    srv5_desc: 'ნაზი და მეგობრული მოვლა ბავშვებისთვის, შიშის გარეშე.',
    srv6_title: 'ქირურგია და პროთეზირება',
    srv6_desc: 'კბილის ამოღება, ქირურგია და მაღალხარისხიანი პროთეზირება.',

    about_eyebrow: 'რატომ ჩვენ',
    about_title: 'რატომ Dental Clinic GT?',
    about_text: 'ჩვენ ვაერთიანებთ თანამედროვე ტექნოლოგიებსა და ადამიანურ ზრუნვას, რათა ყოველი ვიზიტი იყოს კომფორტული და უმტკივნეულო.',
    about_img_alt: 'თანამედროვე სტომატოლოგიური კლინიკის ინტერიერი',
    about_f1: 'გამოცდილი და სერტიფიცირებული ექიმები',
    about_f2: 'უახლესი აპარატურა და სტერილური გარემო',
    about_f3: 'უმტკივნეულო მკურნალობა და ინდივიდუალური მიდგომა',
    about_f4: 'გამჭვირვალე ფასები, ფარული გადასახადების გარეშე',
    about_f5: 'მოქნილი განრიგი და მარტივი ჯავშანი',

    team_eyebrow: 'ჩვენი გუნდი',
    team_title: 'გაიცანით ჩვენი ექიმები',
    team_sub: 'გამოცდილი სპეციალისტები, რომლებიც ზრუნავენ თქვენს ღიმილზე.',
    team_role_1: 'თერაპევტი',
    team_role_2: 'იმპლანტოლოგი · ქირურგი',
    team_role_3: 'ორთოდონტი',
    team_role_4: 'ბავშვთა სტომატოლოგი',

    reviews_eyebrow: 'შეფასებები',
    reviews_title: 'რას ამბობენ ჩვენი პაციენტები',
    review1_text: '„საუკეთესო კლინიკა! ექიმები ყურადღებიანები არიან და მკურნალობა სრულიად უმტკივნეულო იყო."',
    review1_meta: 'იმპლანტაცია',
    review2_text: '„ბავშვს ეშინოდა სტომატოლოგის, აქ კი თამაშ-თამაშით მოვიდა აზრზე. დიდი მადლობა!"',
    review2_meta: 'ბავშვთა მკურნალობა',
    review3_text: '„გათეთრების შემდეგ ღიმილი ამეწყო. თანამედროვე გარემო და პროფესიონალი გუნდი."',
    review3_meta: 'ესთეტიკა',

    faq_eyebrow: 'ხშირი კითხვები',
    faq_title: 'პასუხები თქვენს კითხვებზე',
    faq_q1: 'როგორ დავჯავშნო ვიზიტი?',
    faq_a1: 'შეავსეთ ჯავშნის ფორმა საიტზე ან დაგვირეკეთ ნომერზე +995 599 06 11 19 — ჩვენ შეგირჩევთ თქვენთვის სასურველ დროს.',
    faq_q2: 'მკურნალობა მტკივნეულია?',
    faq_a2: 'არა. ჩვენ ვიყენებთ თანამედროვე ანესთეზიასა და ნაზ ტექნიკას, რათა პროცედურა მაქსიმალურად კომფორტული იყოს.',
    faq_q3: 'გაქვთ განვადება?',
    faq_a3: 'დიახ, ხელმისაწვდომია მოქნილი გადახდის პირობები. დეტალები დააზუსტეთ ვიზიტისას ან სატელეფონო ზარით.',
    faq_q4: 'რამდენ ხანს გრძელდება იმპლანტის ჩადგმა?',
    faq_a4: 'თავად ჩადგმა ჩვეულებრივ 30–60 წუთს გრძელდება, სრული პროცესი კი ინდივიდუალურია — ექიმი დეტალურ გეგმას პირველივე კონსულტაციაზე შეგიდგენთ.',
    faq_q5: 'მკურნალობთ ბავშვებს?',
    faq_a5: 'დიახ, გვყავს ბავშვთა სტომატოლოგი, რომელიც სპეციალურ, მეგობრულ მიდგომას იყენებს პატარებისთვის.',

    contact_eyebrow: 'დაგვიკავშირდით',
    contact_title: 'დაჯავშნეთ ვიზიტი',
    contact_sub: 'აირჩიეთ თავისუფალი დრო კალენდარში და დაჯავშნეთ ვიზიტი ონლაინ. ან დაგვირეკეთ პირდაპირ.',
    book_title: 'დაჯავშნე ონლაინ',
    book_intro: 'აირჩიეთ სერვისი, ექიმი და თავისუფალი დრო — დანარჩენს ჩვენ მოვაგვარებთ.',
    book_eyebrow: 'ონლაინ ჯავშანი',
    cta_book_online: 'ონლაინ დაჯავშნა',
    book_cta_text: 'ნახეთ ექიმების ცოცხალი განრიგი და დაჯავშნეთ თავისუფალი დრო წამებში.',
    book_help_title: 'დახმარება გჭირდებათ?',
    book_help_text: 'დაგვირეკეთ და სიამოვნებით დაგეხმარებით ჯავშანში.',
    back_home: '← მთავარზე',
    contact_addr_label: 'მისამართი',
    contact_addr: 'თბილისი, ნავთლუღის ქ. 5/7 (მეტრო „ისანთან")',
    contact_phone_label: 'ტელეფონი',
    contact_email_label: 'ელ. ფოსტა',
    contact_hours_label: 'სამუშაო საათები',
    contact_hours: 'ორშ–პარ 09:00–20:00 · შაბ 10:00–16:00 · კვ დახურულია',
    map_alt: 'კლინიკის მდებარეობა რუკაზე',
    map_link: 'რუკაზე ნახვა',

    form_title: 'ვიზიტის მოთხოვნა',
    form_name: 'სახელი და გვარი',
    form_name_ph: 'თქვენი სახელი',
    form_phone: 'ტელეფონი',
    form_phone_ph: '+995 5xx xx xx xx',
    form_email: 'ელ. ფოსტა',
    form_email_ph: 'you@email.com',
    form_optional: '(არასავალდებულო)',
    form_service: 'სასურველი სერვისი',
    form_date: 'სასურველი თარიღი',
    form_message: 'შეტყობინება',
    form_message_ph: 'მოგვწერეთ დამატებითი დეტალები...',
    form_submit: 'მოთხოვნის გაგზავნა',
    form_note: 'გაგზავნით თქვენ ეთანხმებით, რომ დაგიკავშირდეთ ვიზიტის დასადასტურებლად.',
    form_success_title: 'მადლობა!',
    form_success_text: 'თქვენი მოთხოვნა მიღებულია. ჩვენ მალე დაგიკავშირდებით.',
    form_book_another: 'ახალი მოთხოვნა',
    err_required: 'ეს ველი სავალდებულოა',
    err_name: 'გთხოვთ შეიყვანოთ მინიმუმ 2 სიმბოლო',
    err_phone: 'გთხოვთ შეიყვანოთ სწორი ტელეფონის ნომერი',
    err_email: 'გთხოვთ შეიყვანოთ სწორი ელ. ფოსტა',

    footer_tagline: 'თქვენი ღიმილი — ჩვენი პრიორიტეტი.',
    footer_nav: 'ნავიგაცია',
    footer_contact: 'კონტაქტი',
    footer_rights: 'ყველა უფლება დაცულია.',
    to_top_aria: 'ზემოთ დაბრუნება',
  },

  en: {
    meta_description: 'Dental Clinic GT — modern dental clinic in Tbilisi. Painless treatment, implants, orthodontics and cosmetic dentistry.',
    skip_to_content: 'Skip to main content',

    nav_services: 'Services',
    nav_pricing: 'Pricing',
    nav_about: 'Why us',
    nav_team: 'Doctors',
    nav_reviews: 'Reviews',
    nav_faq: 'FAQ',
    nav_contact: 'Contact',
    cta_book: 'Book a visit',
    cta_call: 'Call us',
    lang_toggle_aria: 'Switch language to Georgian',
    menu_aria: 'Open menu',

    hero_eyebrow: 'Modern dentistry in Tbilisi',
    hero_title: 'Your smile is at the center of our care',
    hero_subtitle: 'Painless treatment, modern technology and experienced doctors — all in one place.',
    hero_trust_1: 'Certified doctors',
    hero_trust_2: 'Sterile environment',
    hero_trust_3: 'Transparent pricing',
    hero_img_alt: 'Smiling patient at the dental clinic',
    img_hint: 'Photo slot — replace with a real image',
    float_rating: 'Patient rating',
    float_avail_title: 'Available today',
    float_avail_sub: 'Book your visit now',

    stat_years: 'years of experience',
    stat_patients: 'happy patients',
    stat_doctors: 'doctors & specialists',
    stat_rating: 'average rating',

    services_eyebrow: 'Our services',
    services_title: 'Complete dental care',
    services_sub: 'From prevention to complex treatment — everything in one clinic.',
    srv1_title: 'General dentistry',
    srv1_desc: 'Caries treatment, fillings, professional cleaning and prevention.',
    srv2_title: 'Dental implants',
    srv2_desc: 'Restore missing teeth with durable, natural-looking implants.',
    srv3_title: 'Orthodontics',
    srv3_desc: 'Braces and clear aligners for a perfectly aligned smile.',
    srv4_title: 'Cosmetic & whitening',
    srv4_desc: 'Teeth whitening and veneers for a radiant smile.',
    srv5_title: 'Pediatric dentistry',
    srv5_desc: 'Gentle, friendly care for children — without fear.',
    srv6_title: 'Surgery & prosthetics',
    srv6_desc: 'Extractions, surgery and high-quality prosthetics.',

    about_eyebrow: 'Why us',
    about_title: 'Why Dental Clinic GT?',
    about_text: 'We combine modern technology with human care, so every visit is comfortable and painless.',
    about_img_alt: 'Modern dental clinic interior',
    about_f1: 'Experienced, certified doctors',
    about_f2: 'Latest equipment and a sterile environment',
    about_f3: 'Painless treatment and an individual approach',
    about_f4: 'Transparent pricing with no hidden fees',
    about_f5: 'Flexible scheduling and easy booking',

    team_eyebrow: 'Our team',
    team_title: 'Meet our doctors',
    team_sub: 'Experienced specialists who care about your smile.',
    team_role_1: 'Therapist',
    team_role_2: 'Implantologist · Surgeon',
    team_role_3: 'Orthodontist',
    team_role_4: 'Pediatric dentist',

    reviews_eyebrow: 'Reviews',
    reviews_title: 'What our patients say',
    review1_text: '"The best clinic! The doctors are attentive and the treatment was completely painless."',
    review1_meta: 'Dental implants',
    review2_text: '"My child was afraid of the dentist, but here it turned into play. Thank you so much!"',
    review2_meta: 'Pediatric care',
    review3_text: '"After whitening, my smile transformed. Modern setting and a professional team."',
    review3_meta: 'Cosmetic',

    faq_eyebrow: 'FAQ',
    faq_title: 'Answers to your questions',
    faq_q1: 'How do I book an appointment?',
    faq_a1: 'Fill in the booking form on this site or call us at +995 599 06 11 19 — we will find a time that suits you.',
    faq_q2: 'Is the treatment painful?',
    faq_a2: 'No. We use modern anesthesia and gentle techniques to keep every procedure as comfortable as possible.',
    faq_q3: 'Do you offer installment payments?',
    faq_a3: 'Yes, flexible payment options are available. Ask for details during your visit or by phone.',
    faq_q4: 'How long does getting an implant take?',
    faq_a4: 'The placement itself usually takes 30–60 minutes; the full process is individual — your doctor will outline a detailed plan at the first consultation.',
    faq_q5: 'Do you treat children?',
    faq_a5: 'Yes, we have a pediatric dentist who uses a special, friendly approach for little ones.',

    contact_eyebrow: 'Get in touch',
    contact_title: 'Book your visit',
    contact_sub: 'Pick a free time in the calendar and book your visit online. Or call us directly.',
    book_title: 'Book online',
    book_intro: 'Choose a service, a doctor and a free time — we will take care of the rest.',
    book_eyebrow: 'Online booking',
    cta_book_online: 'Book online',
    book_cta_text: 'See the doctors\' live schedule and grab a free time in seconds.',
    book_help_title: 'Need help?',
    book_help_text: 'Call us and we will gladly help you book.',
    back_home: '← Home',
    contact_addr_label: 'Address',
    contact_addr: '5/7 Navtlughi St, Tbilisi (near Isani Metro)',
    contact_phone_label: 'Phone',
    contact_email_label: 'Email',
    contact_hours_label: 'Working hours',
    contact_hours: 'Mon–Fri 09:00–20:00 · Sat 10:00–16:00 · Sun closed',
    map_alt: 'Clinic location on the map',
    map_link: 'View on map',

    form_title: 'Appointment request',
    form_name: 'Full name',
    form_name_ph: 'Your name',
    form_phone: 'Phone',
    form_phone_ph: '+995 5xx xx xx xx',
    form_email: 'Email',
    form_email_ph: 'you@email.com',
    form_optional: '(optional)',
    form_service: 'Preferred service',
    form_date: 'Preferred date',
    form_message: 'Message',
    form_message_ph: 'Tell us any additional details...',
    form_submit: 'Send request',
    form_note: 'By submitting, you agree that we may contact you to confirm your visit.',
    form_success_title: 'Thank you!',
    form_success_text: 'Your request has been received. We will contact you shortly.',
    form_book_another: 'New request',
    err_required: 'This field is required',
    err_name: 'Please enter at least 2 characters',
    err_phone: 'Please enter a valid phone number',
    err_email: 'Please enter a valid email address',

    footer_tagline: 'Your smile is our priority.',
    footer_nav: 'Navigation',
    footer_contact: 'Contact',
    footer_rights: 'All rights reserved.',
    to_top_aria: 'Back to top',
  },
};

const SUPPORTED_LANGS = ['ka', 'en'];
const LANG_KEY = 'dcgt-lang';

/* ------------------------------------------------------------
   2. LANGUAGE SWITCHING
------------------------------------------------------------ */
function getInitialLang() {
  let stored;
  try { stored = localStorage.getItem(LANG_KEY); } catch (e) { stored = null; }
  if (stored && SUPPORTED_LANGS.includes(stored)) return stored;
  return 'ka'; // default: Georgian
}

function applyLang(lang) {
  const dict = I18N[lang] || I18N.ka;

  // Text content (or meta content attribute)
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const value = dict[el.getAttribute('data-i18n')];
    if (value === undefined) return;
    if (el.tagName === 'META') el.setAttribute('content', value);
    else el.textContent = value;
  });

  // Placeholders
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
    const value = dict[el.getAttribute('data-i18n-ph')];
    if (value !== undefined) el.setAttribute('placeholder', value);
  });

  // aria-labels
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    const value = dict[el.getAttribute('data-i18n-aria')];
    if (value !== undefined) el.setAttribute('aria-label', value);
  });

  // image alt text
  document.querySelectorAll('[data-i18n-alt]').forEach((el) => {
    const value = dict[el.getAttribute('data-i18n-alt')];
    if (value !== undefined) el.setAttribute('alt', value);
  });

  document.documentElement.lang = lang;
  document.body.classList.remove('lang-ka', 'lang-en');
  document.body.classList.add('lang-' + lang);

  // Let other modules (e.g. the booking widget) re-render in the new language
  if (typeof window.onLangChange === 'function') window.onLangChange(lang);

  const current = document.getElementById('langCurrent');
  if (current) current.textContent = lang === 'ka' ? 'EN' : 'ქარ';

  try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* ignore */ }
}

function initLangToggle() {
  const btn = document.getElementById('langToggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const next = (document.documentElement.lang === 'ka') ? 'en' : 'ka';
    applyLang(next);
  });
}

/* ------------------------------------------------------------
   3. MOBILE NAVIGATION
------------------------------------------------------------ */
function initMobileNav() {
  const toggle = document.getElementById('navToggle');
  const nav = document.getElementById('primaryNav');
  if (!toggle || !nav) return;

  const close = () => {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  };

  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', close));

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}

/* ------------------------------------------------------------
   4. STICKY HEADER + BACK TO TOP
------------------------------------------------------------ */
function initScrollChrome() {
  const header = document.getElementById('siteHeader');
  const toTop = document.getElementById('toTop');

  const onScroll = () => {
    const y = window.scrollY;
    if (header) header.classList.toggle('scrolled', y > 10);
    if (toTop) {
      const show = y > 500;
      toTop.classList.toggle('show', show);
      toTop.hidden = !show;
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }
}

/* ------------------------------------------------------------
   5. SCROLL REVEAL + STAT COUNTERS
------------------------------------------------------------ */
function animateCount(el) {
  const target = parseInt(el.getAttribute('data-count'), 10);
  if (isNaN(target)) return;
  const duration = 1400;
  const start = performance.now();
  const step = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
    el.textContent = Math.floor(eased * target).toLocaleString('en-US');
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target.toLocaleString('en-US');
  };
  requestAnimationFrame(step);
}

function initReveal() {
  const reveals = document.querySelectorAll('.reveal');
  const counters = document.querySelectorAll('.count');

  if (!('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('in'));
    counters.forEach(animateCount);
    return;
  }

  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      entry.target.querySelectorAll('.count').forEach(animateCount);
      if (entry.target.classList.contains('count')) animateCount(entry.target);
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  reveals.forEach((el) => io.observe(el));
  // Counters inside a .reveal are animated by their parent — only observe standalone ones
  counters.forEach((el) => { if (!el.closest('.reveal')) io.observe(el); });
}

/* ------------------------------------------------------------
   6. CONTACT / BOOKING FORM
   NOTE: This validates and shows a success message in the browser.
   To actually receive submissions by email, connect the form to a
   service such as Formspree, or to your own backend endpoint.
   See README.md → "Connecting the contact form".
------------------------------------------------------------ */
function t(key) {
  const lang = document.documentElement.lang || 'ka';
  return (I18N[lang] && I18N[lang][key]) || I18N.ka[key] || '';
}

function setError(input, key) {
  const msg = input.parentElement.querySelector('.error');
  if (key) {
    input.classList.add('invalid');
    input.setAttribute('aria-invalid', 'true');
    if (msg) msg.textContent = t(key);
  } else {
    input.classList.remove('invalid');
    input.removeAttribute('aria-invalid');
    if (msg) msg.textContent = '';
  }
}

function validateForm(form) {
  let firstInvalid = null;
  const name = form.name;
  const phone = form.phone;
  const email = form.email;

  // Name
  if (!name.value.trim()) { setError(name, 'err_required'); firstInvalid = firstInvalid || name; }
  else if (name.value.trim().length < 2) { setError(name, 'err_name'); firstInvalid = firstInvalid || name; }
  else setError(name, null);

  // Phone
  const phoneClean = phone.value.replace(/[\s\-()]/g, '');
  if (!phone.value.trim()) { setError(phone, 'err_required'); firstInvalid = firstInvalid || phone; }
  else if (!/^\+?\d{6,15}$/.test(phoneClean)) { setError(phone, 'err_phone'); firstInvalid = firstInvalid || phone; }
  else setError(phone, null);

  // Email (optional)
  if (email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
    setError(email, 'err_email'); firstInvalid = firstInvalid || email;
  } else setError(email, null);

  return firstInvalid;
}

function initForm() {
  const form = document.getElementById('bookingForm');
  if (!form) return;

  // Set min date for the date picker to today
  const dateInput = form.querySelector('#date');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Honeypot: if filled, silently ignore (likely a bot)
    if (form.company && form.company.value) { return; }

    const firstInvalid = validateForm(form);
    if (firstInvalid) { firstInvalid.focus(); return; }

    /* ---- Submission point ----
       Replace this block with a real submission, e.g.:
       fetch('https://formspree.io/f/XXXX', { method:'POST', body:new FormData(form), headers:{Accept:'application/json'} })
         .then(...) .catch(...)
    */
    const success = document.getElementById('formSuccess');
    if (success) {
      success.hidden = false;
      success.focus();
      success.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    form.reset();
  });

  // "New request" — hide the success overlay and return to the form
  const resetBtn = document.getElementById('formReset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const success = document.getElementById('formSuccess');
      if (success) success.hidden = true;
      const firstField = form.querySelector('input, select, textarea');
      if (firstField) firstField.focus();
    });
  }

  // Clear errors as the user types
  form.querySelectorAll('input, textarea').forEach((input) => {
    input.addEventListener('input', () => setError(input, null));
  });
}

/* ------------------------------------------------------------
   Image fallback: if a photo fails to load, reveal the
   gradient/illustration placeholder behind it (CSP-safe, no inline onerror)
------------------------------------------------------------ */
function initImageFallback() {
  document.querySelectorAll('.media-img').forEach((img) => {
    img.addEventListener('error', () => img.classList.add('img-failed'));
    if (img.complete && img.naturalWidth === 0) img.classList.add('img-failed');
  });
}

/* ------------------------------------------------------------
   Scroll-spy: highlight the nav link for the section in view
------------------------------------------------------------ */
function initScrollSpy() {
  const links = Array.from(document.querySelectorAll('.nav .nav-link'));
  if (!links.length || !('IntersectionObserver' in window)) return;

  const map = new Map();
  links.forEach((link) => {
    const id = link.getAttribute('href');
    if (id && id.startsWith('#')) {
      const section = document.querySelector(id);
      if (section) map.set(section, link);
    }
  });
  if (!map.size) return;

  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((l) => l.classList.remove('active'));
      const link = map.get(entry.target);
      if (link) link.classList.add('active');
    });
  }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

  map.forEach((_, section) => spy.observe(section));
}

/* ------------------------------------------------------------
   7. INIT
------------------------------------------------------------ */
document.addEventListener('DOMContentLoaded', () => {
  applyLang(getInitialLang());
  initLangToggle();
  initMobileNav();
  initScrollChrome();
  initReveal();
  initForm();
  initImageFallback();
  initScrollSpy();

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
});
