/* ============================================================
   Dental Clinic GT — editable site content loader

   Pulls admin-edited texts and photo versions from the server
   (api/public.php?what=content) and applies them over the
   built-in defaults. If the API is not there (e.g. the static
   demo hosting), it does nothing at all — the site just shows
   its default texts.
   ============================================================ */
'use strict';

(function () {
  fetch('api/public.php?what=content')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (map) {
      if (!map || typeof map !== 'object') return;

      var langs = { ka: {}, en: {} };
      var imgVers = {};
      Object.keys(map).forEach(function (k) {
        var m = /^(ka|en):([a-zA-Z0-9_]+)$/.exec(k);
        if (m) langs[m[1]][m[2]] = map[k];
        else if (/^img_ver_(hero|about)$/.test(k)) imgVers[k] = map[k];
      });

      // Texts: merge into the i18n dictionary, then re-render current language.
      if (typeof I18N !== 'undefined') {
        Object.assign(I18N.ka, langs.ka);
        Object.assign(I18N.en, langs.en);
        if (typeof applyLang === 'function') {
          applyLang(document.documentElement.lang || 'ka');
        }
      }

      // Photos: point at the freshly uploaded file (version busts the cache).
      if (imgVers.img_ver_hero) {
        var h = document.querySelector('.media-hero .media-img');
        if (h) h.src = 'images/hero.jpg?v=' + encodeURIComponent(imgVers.img_ver_hero);
      }
      if (imgVers.img_ver_about) {
        var a = document.querySelector('.media-about .media-img');
        if (a) a.src = 'images/about.jpg?v=' + encodeURIComponent(imgVers.img_ver_about);
      }
    })
    .catch(function () { /* no content API here — defaults stay */ });
})();
