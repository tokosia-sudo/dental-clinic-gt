/* ============================================================
   Dental Clinic GT — Supabase connection (booking + admin)

   The two values below are the PUBLIC project URL and the "anon" key.
   They are SAFE to ship in the browser: the anon key only allows what
   Row Level Security permits (read the catalog + availability, and book
   a slot through a validated function). Reading patient details and
   managing the clinic require a signed-in staff member (Supabase Auth).
   The secret "service_role" key is NEVER placed here.
   ============================================================ */
'use strict';

window.SUPABASE = {
  url: 'https://zwozqysrzmvouopxlsqb.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3b3pxeXNyem12b3VvcHhsc3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyODQzNzMsImV4cCI6MjA5Nzg2MDM3M30.r8EAjssxQiJKkjdg7t7Eai29wzx-Bajhqp_aGbkII18',
  // The clinic operates in Tbilisi time (UTC+4, no daylight saving).
  tzOffsetMinutes: 240,
};

/* Tiny REST + Auth helper over Supabase's API — no external library,
   so the pages stay fully self-contained (no CDN dependency). */
window.SB = (function () {
  const rootUrl = window.SUPABASE.url.replace(/\/+$/, '');
  const restBase = rootUrl + '/rest/v1/';
  const authBase = rootUrl + '/auth/v1/';
  const anonKey = window.SUPABASE.anonKey;
  const SESSION_KEY = 'dcgt_sb_session';

  let session = null;
  try { session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { session = null; }

  function setSession(s) { session = s || null; try { s ? localStorage.setItem(SESSION_KEY, JSON.stringify(s)) : localStorage.removeItem(SESSION_KEY); } catch (e) {} }
  function getSession() { return session; }
  function isAuthed() { return !!(session && session.access_token); }
  function bearer() { return (session && session.access_token) || anonKey; }
  function authHeaders(extra) { return Object.assign({ apikey: anonKey, Authorization: 'Bearer ' + bearer() }, extra || {}); }

  async function select(pathAndQuery) {
    const res = await fetch(restBase + pathAndQuery, { headers: authHeaders() });
    if (res.status === 401 && session) setSession(null);
    if (!res.ok) { const e = new Error('select ' + pathAndQuery + ' -> ' + res.status); e.status = res.status; throw e; }
    return res.json();
  }

  async function write(method, pathAndQuery, body, prefer) {
    const res = await fetch(restBase + pathAndQuery, {
      method: method,
      headers: authHeaders(Object.assign({ 'Content-Type': 'application/json' }, prefer ? { Prefer: prefer } : {})),
      body: body != null ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401 && session) setSession(null);
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
    if (!res.ok) { const e = new Error(method + ' ' + pathAndQuery + ' -> ' + res.status); e.status = res.status; e.body = data; throw e; }
    return data;
  }

  function rpc(fnName, args) { return write('POST', 'rpc/' + fnName, args || {}); }

  async function signIn(email, password) {
    const res = await fetch(authBase + 'token?grant_type=password', {
      method: 'POST',
      headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password }),
    });
    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    if (!res.ok || !data || !data.access_token) { const e = new Error('signIn -> ' + res.status); e.status = res.status; e.body = data; throw e; }
    setSession(data);
    return data;
  }

  async function signOut() {
    try { await fetch(authBase + 'logout', { method: 'POST', headers: authHeaders() }); } catch (e) {}
    setSession(null);
  }

  return { select: select, write: write, rpc: rpc, signIn: signIn, signOut: signOut, isAuthed: isAuthed, getSession: getSession, setSession: setSession };
})();
