/* ============================================================
   Dental Clinic GT — Supabase connection (live booking backend)

   The two values below are the PUBLIC project URL and the "anon" key.
   They are SAFE to ship in the browser: the anon key only allows what
   Row Level Security permits (read the catalog + availability, and book
   a slot through a validated database function). The secret
   "service_role" key is NEVER placed here.
   ============================================================ */
'use strict';

window.SUPABASE = {
  url: 'https://zwozqysrzmvouopxlsqb.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3b3pxeXNyem12b3VvcHhsc3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyODQzNzMsImV4cCI6MjA5Nzg2MDM3M30.r8EAjssxQiJKkjdg7t7Eai29wzx-Bajhqp_aGbkII18',
  // The clinic operates in Tbilisi time (UTC+4, no daylight saving).
  tzOffsetMinutes: 240,
};

/* Tiny REST helper over Supabase's auto-generated API — no external library,
   so the page stays fully self-contained (no CDN dependency). */
window.SB = (function () {
  const base = window.SUPABASE.url.replace(/\/+$/, '') + '/rest/v1/';
  const key = window.SUPABASE.anonKey;
  const authHeaders = { apikey: key, Authorization: 'Bearer ' + key };

  async function select(pathAndQuery) {
    const res = await fetch(base + pathAndQuery, { headers: authHeaders });
    if (!res.ok) { const e = new Error('select ' + pathAndQuery + ' -> ' + res.status); e.status = res.status; throw e; }
    return res.json();
  }

  async function rpc(fnName, args) {
    const res = await fetch(base + 'rpc/' + fnName, {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders),
      body: JSON.stringify(args || {}),
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
    if (!res.ok) { const e = new Error('rpc ' + fnName + ' -> ' + res.status); e.status = res.status; e.body = data; throw e; }
    return data;
  }

  return { select: select, rpc: rpc };
})();
