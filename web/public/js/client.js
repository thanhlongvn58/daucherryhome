/* Browser client for the self-hosted server.
   Exposes the same small surface the app was written against (db / user / downloads via claude.use),
   backed by the REST API + Server-Sent Events, plus window.FIN for members, session and restore. */
(function () {
  'use strict';

  class ApiError extends Error { constructor(code, message, status) { super(message); this.code = code; this.status = status; } }

  async function api(method, url, body) {
    let r;
    try {
      r = await fetch(url, {
        method, credentials: 'same-origin',
        headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch { throw new ApiError('unavailable', 'Không kết nối được máy chủ.', 0); }
    if (r.status === 401 && !url.startsWith('/api/session') && !url.startsWith('/api/login')) {
      location.replace('/login?next=' + encodeURIComponent(location.pathname + location.hash));
      throw new ApiError('revoked', 'Phiên đăng nhập đã hết.', 401);
    }
    let data = null;
    try { data = await r.json(); } catch { /* empty body */ }
    if (!r.ok) {
      const code = data?.code || (r.status === 403 ? 'permission_denied' : r.status >= 500 ? 'unavailable' : 'invalid_argument');
      throw new ApiError(code, data?.message || r.statusText, r.status);
    }
    return data;
  }

  /* ---------- live collections ---------- */
  const subs = new Map();      // collection -> Set<fn(docs)>
  const cache = new Map();     // collection -> docs
  const inflight = new Map();
  const lastSig = new Map();   // collection -> JSON of last delivered docs (skip no-op redraws)
  const memberFns = new Set();

  function refresh(col) {
    if (inflight.has(col)) return inflight.get(col);
    const p = api('GET', '/api/c/' + col)
      .then(r => {
        const sig = JSON.stringify(r.docs);
        if (sig === lastSig.get(col)) return;
        lastSig.set(col, sig); cache.set(col, r.docs);
        for (const fn of subs.get(col) || []) fn(r.docs);
      })
      .catch(e => { if (e.code !== 'revoked') console.warn('Tải lại thất bại', col, e.message); })
      .finally(() => inflight.delete(col));
    inflight.set(col, p);
    return p;
  }
  let es = null;
  const status = { online: true, fns: new Set() };
  function setOnline(v) { if (status.online !== v) { status.online = v; status.fns.forEach(fn => fn(v)); } }
  function ensureStream() {
    if (es) return;
    es = new EventSource('/api/stream');
    es.addEventListener('change', ev => {
      let c; try { c = JSON.parse(ev.data).collection; } catch { return; }
      if (c === '_members') { members = null; loadMembers(); } else if (subs.has(c)) refresh(c);
    });
    es.addEventListener('open', () => { setOnline(true); for (const c of subs.keys()) refresh(c); });
    es.addEventListener('error', () => setOnline(false));
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) for (const c of subs.keys()) refresh(c); });

  const snap = d => ({ id: d.id, exists: true, data: () => d.data, metadata: { fromCache: false, hasPendingWrites: false } });
  const missing = id => ({ id, exists: false, data: () => undefined, metadata: { fromCache: false, hasPendingWrites: false } });

  function subscribe(col, fn) {
    if (!subs.has(col)) subs.set(col, new Set());
    subs.get(col).add(fn);
    ensureStream();
    if (cache.has(col)) fn(cache.get(col)); else refresh(col);
    return () => subs.get(col)?.delete(fn);
  }
  const newId = () => {
    const b = crypto.getRandomValues(new Uint8Array(10));
    return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  function docRef(col, id) {
    const url = '/api/d/' + col + '/' + encodeURIComponent(id);
    const after = r => { refresh(col); return r; };
    return {
      id, path: col + '/' + id,
      async get() { try { const r = await api('GET', url); return snap(r.doc); } catch (e) { if (e.status === 404) return missing(id); throw e; } },
      set: data => api('PUT', url, { data }).then(after).then(() => undefined),
      update: data => api('PATCH', url, { data }).then(after).then(() => undefined),
      delete: () => api('DELETE', url).then(after).then(() => undefined),
      onSnapshot(next) { return subscribe(col, docs => { const d = docs.find(x => x.id === id); next(d ? snap(d) : missing(id)); }); },
    };
  }
  function collectionRef(col) {
    return {
      path: col,
      doc: id => docRef(col, id ?? newId()),
      async add(data) { const r = await api('POST', '/api/c/' + col, { data }); refresh(col); return docRef(col, r.doc.id); },
      onSnapshot(next) { return subscribe(col, docs => { const list = docs.map(snap); next({ docs: list, size: list.length, empty: !list.length, docChanges: () => [], metadata: { fromCache: false, hasPendingWrites: false } }); }); },
    };
  }
  const db = {
    collection: path => collectionRef(path),
    doc: path => { const i = path.indexOf('/'); return docRef(path.slice(0, i), path.slice(i + 1)); },
  };

  /* ---------- people ---------- */
  let session = null;
  let members = null;
  let membersP = null;
  function loadMembers() {
    if (members) return Promise.resolve(members);
    if (!membersP) membersP = api('GET', '/api/members').then(r => { members = r.members; memberFns.forEach(fn => fn(members)); return members; }).finally(() => { membersP = null; });
    return membersP;
  }
  function initials(name) {
    const parts = String(name || '?').trim().split(/\s+/);
    return ((parts.length > 1 ? parts[parts.length - 2][0] : '') + parts[parts.length - 1][0]).toUpperCase();
  }
  function avatar(name, color) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="32" fill="${color || '#647880'}"/><text x="32" y="41" font-family="Arial,sans-serif" font-size="24" font-weight="700" fill="#fff" text-anchor="middle">${initials(name).replace(/[<&>"]/g, '')}</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  const profile = m => ({ id: m.id, name: m.name, avatarUrl: avatar(m.name, m.color), color: m.color, email: null, isMe: m.id === session?.id, guest: false });
  const user = {
    id: async () => session?.id ?? null,
    isOwner: async () => session?.role === 'owner',
    canEdit: async () => session?.role === 'owner',
    can: async name => (name === 'data.write' ? session?.role !== 'viewer' : null),
    me: async () => ({ id: session.id, name: session.name, avatarUrl: avatar(session.name, session.color), color: session.color, email: null, isOwner: session.role === 'owner', canEdit: session.role === 'owner' }),
    async profiles(ids) {
      const list = await loadMembers().catch(() => []);
      const out = {};
      for (const id of [].concat(ids)) { const m = list.find(x => x.id === id); out[id] = m ? profile(m) : { id, name: '', avatarUrl: avatar('?', '#647880'), color: '#647880', email: null, isMe: false, guest: false }; }
      return out;
    },
  };

  /* ---------- downloads ---------- */
  const downloads = {
    async save({ filename, data }) {
      const type = filename.endsWith('.csv') ? 'text/csv;charset=utf-8' : filename.endsWith('.json') ? 'application/json' : 'application/octet-stream';
      const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type }));
      const a = Object.assign(document.createElement('a'), { href: url, download: filename });
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      return { status: 'saved' };
    },
  };

  /* ---------- boot ---------- */
  const ready = api('GET', '/api/session').then(r => {
    if (!r.user) { location.replace(r.needsSetup ? '/login?setup=1' : '/login?next=' + encodeURIComponent(location.pathname + location.hash)); return new Promise(() => {}); }
    session = r.user;
    loadMembers().catch(() => {});
    startIdleWatch(r.idleMinutes);
  });

  /* ---------- automatic sign-out after inactivity ----------
     Any tap, key, scroll or pointer movement counts as activity; the time is shared between tabs.
     One minute before the limit a notice offers to continue. The server keeps the same limit, so a
     closed or sleeping device is signed out too; while active, the session is refreshed at most once a minute. */
  const ACT_KEY = 'stc.lastActive';
  const tr = (s, v) => (window.STCI18n ? STCI18n.t(s, v) : s);
  function startIdleWatch(minutes) {
    const limit = (minutes == null ? 20 : +minutes) * 60_000;
    if (!(limit > 0)) return;
    let last = Date.now(), lastPing = Date.now(), lastSave = 0, warn = null, gone = false;
    const read = () => { let v = 0; try { v = +localStorage.getItem(ACT_KEY) || 0; } catch { /* private mode */ } return Math.max(last, v); };
    const hide = () => { if (warn) { warn.remove(); warn = null; } };
    function active() {
      const t = Date.now(); last = t; hide();
      if (t - lastSave > 5000) { lastSave = t; try { localStorage.setItem(ACT_KEY, String(t)); } catch { /* private mode */ } }
      if (t - lastPing > 60_000) {
        lastPing = t;
        fetch('/api/session', { credentials: 'same-origin' }).then(r => r.json()).then(j => { if (!j.user) signOut(); }).catch(() => {});
      }
    }
    function signOut() {
      if (gone) return; gone = true;
      fetch('/api/logout', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{}', keepalive: true })
        .catch(() => {}).finally(() => location.replace('/login?timeout=1'));
    }
    function check() {
      const left = limit - (Date.now() - read());
      if (left <= 0) { signOut(); return; }
      if (left <= 60_000) {
        if (!warn) {
          warn = document.createElement('div');
          warn.className = 'idle-warn'; warn.setAttribute('role', 'alertdialog'); warn.setAttribute('aria-live', 'assertive');
          warn.innerHTML = '<div><b></b><span></span></div><button type="button" class="btn primary sm"></button>';
          warn.querySelector('b').textContent = tr('Bạn còn đang làm việc chứ?');
          warn.querySelector('button').textContent = tr('Tiếp tục làm việc');
          warn.querySelector('button').addEventListener('click', active);
          document.body.append(warn);
        }
        warn.querySelector('span').textContent = tr('Để bảo vệ thông tin, sổ sẽ tự đăng xuất sau {n} giây.', { n: Math.ceil(left / 1000) });
      } else hide();
    }
    for (const ev of ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll']) document.addEventListener(ev, () => { if (!gone) active(); }, { capture: true, passive: true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
    window.addEventListener('focus', check);
    try { localStorage.setItem(ACT_KEY, String(Date.now())); } catch { /* private mode */ }
    setInterval(check, 1000);
  }

  window.claude = { use: async name => { await ready; return { db, user, downloads }[name] ?? null; } };

  window.FIN = {
    ApiError,
    session: () => session,
    members: () => loadMembers(),
    onMembers: fn => { memberFns.add(fn); if (members) fn(members); return () => memberFns.delete(fn); },
    onConnection: fn => { status.fns.add(fn); return () => status.fns.delete(fn); },
    addMember: b => api('POST', '/api/members', b).then(r => { members = null; loadMembers(); return r.member; }),
    updateMember: (id, b) => api('PATCH', '/api/members/' + encodeURIComponent(id), b).then(r => { members = null; loadMembers(); if (id === session?.id && r.member) session = { ...session, ...r.member }; return r.member; }),
    removeMember: id => api('DELETE', '/api/members/' + encodeURIComponent(id)).then(() => { members = null; loadMembers(); }),
    importBackup: backup => api('POST', '/api/import', { backup }),
    async logout(reason) { try { await api('POST', '/api/logout', {}); } finally { location.replace(reason === 'timeout' ? '/login?timeout=1' : '/login'); } },
  };
})();
