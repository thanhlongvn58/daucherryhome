import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { openStore, COLLECTIONS, ID_RE, backupToDocs } from './store.js';
import { createAuth, httpError, ROLES } from './auth.js';

const COOKIE = 'stc_session';
const OWNER_DELETE = new Set(['vcbf']);
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.webp': 'image/webp',
};
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

export function createApp(cfg) {
  const store = openStore(cfg.dataDir);
  const auth = createAuth(store, cfg);
  const streams = new Set();

  /* ---------------- helpers ---------------- */
  const clientIp = req => (cfg.trustProxy && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || '?';
  const isHttps = req => (cfg.trustProxy && req.headers['x-forwarded-proto'] === 'https') || !!req.socket.encrypted;

  function securityHeaders(res, req) {
    res.setHeader('Content-Security-Policy', CSP);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    if (isHttps(req)) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  }
  function send(res, status, body, headers = {}) {
    const isJson = typeof body !== 'string' && !Buffer.isBuffer(body) && body !== undefined;
    const payload = body === undefined ? '' : isJson ? JSON.stringify(body) : body;
    res.writeHead(status, { 'Content-Type': isJson ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
    res.end(payload);
  }
  function parseCookies(req) {
    const out = {};
    for (const part of String(req.headers.cookie || '').split(';')) {
      const i = part.indexOf('='); if (i < 0) continue;
      out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
    }
    return out;
  }
  /** maxAge null → a browser-session cookie (gone when the browser closes); used unless "remember me" is ticked. */
  function sessionCookie(req, token, maxAge) {
    const secure = cfg.cookieSecure || isHttps(req);
    return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax${maxAge == null ? '' : '; Max-Age=' + maxAge}${secure ? '; Secure' : ''}`;
  }
  async function readJson(req, limit = 256 * 1024) {
    const type = String(req.headers['content-type'] || '');
    if (!type.startsWith('application/json')) throw httpError(415, 'Yêu cầu phải ở dạng JSON.', 'invalid_argument');
    let size = 0; const chunks = [];
    for await (const c of req) { size += c.length; if (size > limit) throw httpError(413, 'Dữ liệu gửi lên quá lớn.'); chunks.push(c); }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); }
    catch { throw httpError(400, 'Dữ liệu JSON không hợp lệ.'); }
  }
  /** Reject cross-site state-changing requests. Same-origin fetches always carry Origin on POST/PUT/PATCH/DELETE. */
  function checkOrigin(req) {
    const origin = req.headers.origin;
    if (!origin) return; // non-browser clients (curl, scripts) – they still need the session cookie
    const host = (cfg.trustProxy && req.headers['x-forwarded-host']) || req.headers.host;
    const allowed = new Set([`${isHttps(req) ? 'https' : 'http'}://${host}`]);
    if (cfg.publicUrl) allowed.add(cfg.publicUrl);
    if (!allowed.has(origin)) throw httpError(403, 'Yêu cầu đến từ trang khác bị chặn.');
  }
  function broadcast(collection) {
    const msg = `event: change\ndata: ${JSON.stringify({ collection })}\n\n`;
    for (const s of streams) s.write(msg);
  }
  const needRole = (user, ...roles) => { if (!roles.includes(user.role)) throw httpError(403, 'Bạn không có quyền thực hiện thao tác này.'); };
  const checkCol = c => { if (!COLLECTIONS.includes(c)) throw httpError(404, 'Không có mục dữ liệu này.'); };
  const checkId = id => { if (!ID_RE.test(id)) throw httpError(400, 'Mã bản ghi không hợp lệ.'); };
  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);

  /* ---------------- routes ---------------- */
  const routes = [];
  const route = (method, pattern, handler, opts = {}) => routes.push({ method, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), handler, ...opts });

  route('GET', '/healthz', () => ({ ok: true }), { public: true });

  // Official bank logo files dropped into public/banks/<code>.(svg|png|webp) replace the colour badges.
  route('GET', '/api/bank-logos', () => {
    let files = [];
    try { files = fs.readdirSync(path.join(cfg.publicDir, 'banks')).filter(f => /^[a-z0-9-]+\.(svg|png|webp)$/i.test(f)); } catch { /* folder missing */ }
    return { logos: Object.fromEntries(files.map(f => [f.replace(/\.[^.]+$/, '').toLowerCase(), '/banks/' + f])) };
  });

  route('GET', '/api/session', ({ user }) => user ? { user, idleMinutes: cfg.sessionIdleMinutes } : { user: null, needsSetup: auth.needsSetup() }, { public: true });

  route('POST', '/api/setup', async ({ req, res }) => {
    if (!auth.needsSetup()) throw httpError(409, 'Sổ đã được thiết lập. Hãy đăng nhập.');
    const b = await readJson(req);
    const user = await auth.createUser({ ...b, role: 'owner' });
    const token = auth.startSession(user.id);
    res.setHeader('Set-Cookie', sessionCookie(req, token, null));
    return { user };
  }, { public: true });

  route('POST', '/api/login', async ({ req, res }) => {
    const b = await readJson(req);
    const { token, user } = await auth.login(b.username, b.password, clientIp(req));
    res.setHeader('Set-Cookie', sessionCookie(req, token, b.remember === true ? auth.sessionMaxAge() : null));
    return { user, idleMinutes: cfg.sessionIdleMinutes };
  }, { public: true });

  route('POST', '/api/logout', ({ req, res, token }) => {
    auth.logout(token);
    res.setHeader('Set-Cookie', sessionCookie(req, '', 0));
    return { ok: true };
  }, { public: true });

  // Members
  route('GET', '/api/members', () => ({ members: auth.listUsers() }));
  route('POST', '/api/members', async ({ req, user }) => {
    needRole(user, 'owner');
    const b = await readJson(req);
    const m = await auth.createUser({ username: b.username, name: b.name, password: b.password, role: ROLES.includes(b.role) ? b.role : 'member' });
    broadcast('_members');
    return { member: m };
  });
  route('PATCH', '/api/members/:id', async ({ req, user, params, token }) => {
    const b = await readJson(req);
    const self = params.id === user.id;
    if (!self) needRole(user, 'owner');
    let m = auth.getUser(params.id);
    if (!m) throw httpError(404, 'Không tìm thấy thành viên.');
    if (b.name !== undefined || b.role !== undefined) {
      if (b.role !== undefined && b.role !== m.role) needRole(user, 'owner');
      m = auth.updateUser(params.id, { name: b.name, role: b.role });
    }
    if (b.password !== undefined) {
      if (self) {
        if (!(await auth.checkPassword(user.id, b.currentPassword))) throw httpError(400, 'Mật khẩu hiện tại chưa đúng.');
        await auth.setPassword(user.id, b.password, { keepToken: token });
      } else {
        await auth.setPassword(params.id, b.password);
      }
    }
    broadcast('_members');
    return { member: m };
  });
  route('DELETE', '/api/members/:id', ({ user, params }) => {
    needRole(user, 'owner');
    if (params.id === user.id) throw httpError(400, 'Bạn không thể tự xóa tài khoản của mình.');
    auth.deleteUser(params.id);
    broadcast('_members');
    return { ok: true };
  });

  // Documents
  route('GET', '/api/c/:col', ({ params }) => { checkCol(params.col); return { docs: store.list(params.col) }; });
  route('POST', '/api/c/:col', async ({ req, user, params }) => {
    needRole(user, 'owner', 'member'); checkCol(params.col);
    const b = await readJson(req); if (!isObj(b.data)) throw httpError(400, 'Thiếu dữ liệu.');
    const id = crypto.randomBytes(10).toString('base64url');
    const doc = store.set(params.col, id, b.data, user.id);
    broadcast(params.col);
    return { doc };
  });
  route('GET', '/api/d/:col/:id', ({ params }) => {
    checkCol(params.col); checkId(params.id);
    const doc = store.get(params.col, params.id);
    if (!doc) throw httpError(404, 'Không tìm thấy bản ghi.');
    return { doc };
  });
  route('PUT', '/api/d/:col/:id', async ({ req, user, params }) => {
    needRole(user, 'owner', 'member'); checkCol(params.col); checkId(params.id);
    const b = await readJson(req); if (!isObj(b.data)) throw httpError(400, 'Thiếu dữ liệu.');
    const doc = store.set(params.col, params.id, b.data, user.id);
    broadcast(params.col);
    return { doc };
  });
  route('PATCH', '/api/d/:col/:id', async ({ req, user, params }) => {
    needRole(user, 'owner', 'member'); checkCol(params.col); checkId(params.id);
    const b = await readJson(req); if (!isObj(b.data)) throw httpError(400, 'Thiếu dữ liệu.');
    const doc = store.update(params.col, params.id, b.data, user.id);
    if (!doc) throw httpError(404, 'Không tìm thấy bản ghi để cập nhật.');
    broadcast(params.col);
    return { doc };
  });
  route('DELETE', '/api/d/:col/:id', ({ user, params }) => {
    needRole(user, 'owner', 'member'); checkCol(params.col); checkId(params.id);
    if (OWNER_DELETE.has(params.col)) needRole(user, 'owner');   // investment transactions: only the owner deletes
    store.remove(params.col, params.id, user.id);
    broadcast(params.col);
    return { ok: true };
  });

  // Backup / restore
  route('GET', '/api/export', ({ res }) => {
    const name = `sao-luu-tai-chinh-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    return store.exportAll();
  });
  route('POST', '/api/import', async ({ req, user }) => {
    needRole(user, 'owner');
    const b = await readJson(req, 20 * 1024 * 1024);
    try { backupToDocs(b.backup); } // validate before touching anything
    catch (e) { throw httpError(400, e.message); }
    store.backupTo(path.join(cfg.dataDir, 'backups', `truoc-khi-khoi-phuc-${Date.now()}.db`));
    const n = store.importAll(b.backup, user.id);
    for (const c of COLLECTIONS) broadcast(c);
    return { imported: n };
  });

  // Live updates (Server-Sent Events)
  route('GET', '/api/stream', ({ req, res }) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.write('retry: 3000\n\n');
    streams.add(res);
    const ping = setInterval(() => res.write(': ping\n\n'), 25_000);
    req.on('close', () => { clearInterval(ping); streams.delete(res); });
    return undefined;
  }, { raw: true });

  /* ---------------- static files ---------------- */
  const PAGES = { '/': 'index.html', '/login': 'login.html' };
  function serveStatic(req, res, pathname) {
    let rel = PAGES[pathname] ?? decodeURIComponent(pathname).replace(/^\/+/, '');
    const file = path.resolve(cfg.publicDir, rel);
    if (!file.startsWith(cfg.publicDir + path.sep)) return send(res, 403, 'Forbidden');
    let st; try { st = fs.statSync(file); } catch { st = null; }
    if (!st || !st.isFile()) return send(res, 404, 'Không tìm thấy trang.');
    const ext = path.extname(file).toLowerCase();
    const etag = `"${st.size.toString(36)}-${Math.floor(st.mtimeMs).toString(36)}"`;
    const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream', ETag: etag, 'Cache-Control': 'no-cache' }; // always revalidate (cheap 304 via ETag) so fixes reach every device at once
    if (req.headers['if-none-match'] === etag) { res.writeHead(304, headers); return res.end(); }
    res.writeHead(200, { ...headers, 'Content-Length': st.size });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  }

  /* ---------------- dispatcher ---------------- */
  async function handle(req, res) {
    const started = Date.now();
    securityHeaders(res, req);
    const url = new URL(req.url, 'http://local');
    const pathname = url.pathname;
    let r = null;
    try {
      if (!pathname.startsWith('/api/') && pathname !== '/healthz') {
        if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method Not Allowed');
        return serveStatic(req, res, pathname);
      }
      r = routes.find(x => x.method === req.method && x.re.test(pathname));
      if (!r) throw httpError(routes.some(x => x.re.test(pathname)) ? 405 : 404, 'Không có API này.');
      if (req.method !== 'GET') checkOrigin(req);
      const token = parseCookies(req)[COOKIE];
      const user = auth.resolve(token);
      if (!r.public && !user) throw httpError(401, 'Phiên đăng nhập đã hết. Hãy đăng nhập lại.');
      const params = r.re.exec(pathname).groups || {};
      const out = await r.handler({ req, res, user, token, params, url });
      if (!r.raw) send(res, 200, out);
    } catch (e) {
      const status = e.status || 500;
      if (status >= 500) console.error(`[${new Date().toISOString()}] ${req.method} ${pathname}`, e);
      const message = status >= 500 ? 'Máy chủ gặp lỗi. Thử lại sau.' : e.message;
      if (res.headersSent) res.end();
      else send(res, status, { code: e.code || 'unavailable', message });
    } finally {
      if (cfg.logRequests && pathname !== '/api/stream') console.log(`${req.method} ${pathname} ${res.statusCode} ${Date.now() - started}ms`);
    }
  }

  /* ---------------- backups ---------------- */
  function rotateBackups() {
    const dir = path.join(cfg.dataDir, 'backups');
    const name = `finance-${new Date().toISOString().slice(0, 10)}.db`;
    try {
      store.backupTo(path.join(dir, name));
      const files = fs.readdirSync(dir).filter(f => /^finance-\d{4}-\d{2}-\d{2}\.db$/.test(f)).sort();
      for (const f of files.slice(0, Math.max(0, files.length - cfg.backupKeep))) fs.rmSync(path.join(dir, f));
    } catch (e) { console.error('Sao lưu tự động thất bại:', e.message); }
  }

  const server = http.createServer((req, res) => { handle(req, res); });
  server.headersTimeout = 30_000;
  server.requestTimeout = 60_000;
  let timers = [];

  return {
    server, store, auth,
    /** `port` is a number, or a socket / pipe path handed over by a web server (e.g. LiteSpeed). */
    listen(port = cfg.port, host = cfg.host) {
      return new Promise((resolve, reject) => {
        const ready = () => {
          if (cfg.backupHours > 0) {
            rotateBackups();
            timers.push(setInterval(rotateBackups, cfg.backupHours * 3600_000));
          }
          timers.push(setInterval(() => auth.purgeExpired(), 6 * 3600_000));
          resolve(server.address());
        };
        server.once('error', reject);
        if (typeof port === 'string') server.listen(port, ready); else server.listen(port, host, ready);
      });
    },
    close() {
      return new Promise(resolve => {
        timers.forEach(clearInterval); timers = [];
        for (const s of streams) s.end();
        streams.clear();
        server.close(() => { store.close(); resolve(); });
        server.closeAllConnections?.();
      });
    },
  };
}
