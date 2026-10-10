import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };
export const ROLES = ['owner', 'member', 'viewer'];
const COLORS = ['#0A6C87', '#A0437B', '#4B8C38', '#B4513A', '#3D5DAE', '#7657C4', '#A9842A', '#12804F'];

export async function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(pw, salt, SCRYPT.keylen, SCRYPT);
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64'), key.toString('base64')].join('$');
}
export async function verifyPassword(pw, stored) {
  const [alg, N, r, p, salt, hash] = String(stored).split('$');
  if (alg !== 'scrypt') return false;
  const expected = Buffer.from(hash, 'base64');
  const key = await scrypt(pw, Buffer.from(salt, 'base64'), expected.length, { N: +N, r: +r, p: +p });
  return crypto.timingSafeEqual(key, expected);
}
// Spend the same time on unknown usernames so response timing doesn't reveal which accounts exist.
const DUMMY_HASH = hashPassword(crypto.randomBytes(12).toString('hex'));

const sha256 = s => crypto.createHash('sha256').update(s).digest('base64url');

export function validateUsername(u) {
  const v = String(u ?? '').trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,32}$/.test(v)) return { error: 'Tên đăng nhập gồm 3–32 ký tự: chữ không dấu, số, dấu chấm, gạch ngang.' };
  return { value: v };
}
export function validateName(n) {
  const v = String(n ?? '').trim().replace(/\s+/g, ' ');
  if (v.length < 1 || v.length > 40) return { error: 'Tên hiển thị cần 1–40 ký tự.' };
  return { value: v };
}
export function validatePassword(p) {
  const v = String(p ?? '');
  if (v.length < 8) return { error: 'Mật khẩu cần ít nhất 8 ký tự.' };
  if (v.length > 200) return { error: 'Mật khẩu quá dài.' };
  return { value: v };
}

export function createAuth(store, cfg) {
  const db = store.db;
  const q = {
    countUsers: db.prepare('SELECT COUNT(*) AS n FROM users'),
    userById: db.prepare('SELECT * FROM users WHERE id = ?'),
    userByName: db.prepare('SELECT * FROM users WHERE username = ?'),
    users: db.prepare('SELECT id, username, name, role, color, created_at FROM users ORDER BY created_at'),
    insertUser: db.prepare('INSERT INTO users (id, username, name, role, pass_hash, color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'),
    updateUser: db.prepare('UPDATE users SET name = ?, role = ? WHERE id = ?'),
    setPass: db.prepare('UPDATE users SET pass_hash = ? WHERE id = ?'),
    deleteUser: db.prepare('DELETE FROM users WHERE id = ?'),
    owners: db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'owner'"),
    insertSession: db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at, last_seen) VALUES (?, ?, ?, ?, ?)'),
    session: db.prepare('SELECT s.*, u.id AS uid, u.username, u.name, u.role, u.color FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?'),
    touch: db.prepare('UPDATE sessions SET last_seen = ?, expires_at = ? WHERE token_hash = ?'),
    deleteSession: db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
    deleteUserSessions: db.prepare('DELETE FROM sessions WHERE user_id = ?'),
    deleteOtherSessions: db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?'),
    purge: db.prepare('DELETE FROM sessions WHERE expires_at < ? OR last_seen < ?'),
  };
  const ttl = cfg.sessionDays * 86400_000;
  const idle = (cfg.sessionIdleMinutes || 0) * 60_000;
  const publicUser = u => u && ({ id: u.id ?? u.uid, username: u.username, name: u.name, role: u.role, color: u.color });

  // Login throttling: 8 failed attempts per IP in 15 minutes.
  const fails = new Map();
  const WINDOW = 15 * 60_000, MAX_FAILS = 8;
  function throttled(ip) {
    const f = fails.get(ip);
    if (!f || Date.now() - f.first > WINDOW) return false;
    return f.n >= MAX_FAILS;
  }
  function recordFail(ip) {
    const f = fails.get(ip);
    if (!f || Date.now() - f.first > WINDOW) fails.set(ip, { n: 1, first: Date.now() });
    else f.n++;
  }

  const auth = {
    needsSetup: () => q.countUsers.get().n === 0,
    listUsers: () => q.users.all().map(publicUser),
    getUser: id => publicUser(q.userById.get(id)),

    async createUser({ username, name, password, role }) {
      const u = validateUsername(username); if (u.error) throw httpError(400, u.error);
      const n = validateName(name); if (n.error) throw httpError(400, n.error);
      const p = validatePassword(password); if (p.error) throw httpError(400, p.error);
      if (!ROLES.includes(role)) throw httpError(400, 'Vai trò không hợp lệ.');
      if (q.userByName.get(u.value)) throw httpError(409, 'Tên đăng nhập này đã có người dùng.');
      const id = 'u_' + crypto.randomBytes(12).toString('base64url');
      const color = COLORS[q.countUsers.get().n % COLORS.length];
      q.insertUser.run(id, u.value, n.value, role, await hashPassword(p.value), color, Date.now());
      return auth.getUser(id);
    },
    updateUser(id, { name, role }) {
      const cur = q.userById.get(id); if (!cur) throw httpError(404, 'Không tìm thấy thành viên.');
      const n = name === undefined ? { value: cur.name } : validateName(name); if (n.error) throw httpError(400, n.error);
      const r = role === undefined ? cur.role : role;
      if (!ROLES.includes(r)) throw httpError(400, 'Vai trò không hợp lệ.');
      if (cur.role === 'owner' && r !== 'owner' && q.owners.get().n <= 1) throw httpError(400, 'Gia đình cần ít nhất một Chủ nhà.');
      q.updateUser.run(n.value, r, id);
      return auth.getUser(id);
    },
    async setPassword(id, password, { keepToken } = {}) {
      const p = validatePassword(password); if (p.error) throw httpError(400, p.error);
      q.setPass.run(await hashPassword(p.value), id);
      // Sign the account out everywhere else.
      if (keepToken) q.deleteOtherSessions.run(id, sha256(keepToken)); else q.deleteUserSessions.run(id);
    },
    async checkPassword(id, password) {
      const u = q.userById.get(id);
      return !!u && verifyPassword(String(password ?? ''), u.pass_hash);
    },
    deleteUser(id) {
      const cur = q.userById.get(id); if (!cur) throw httpError(404, 'Không tìm thấy thành viên.');
      if (cur.role === 'owner' && q.owners.get().n <= 1) throw httpError(400, 'Không thể xóa Chủ nhà duy nhất.');
      q.deleteUser.run(id);
    },

    async login(username, password, ip) {
      if (throttled(ip)) throw httpError(429, 'Đăng nhập sai quá nhiều lần. Thử lại sau 15 phút.');
      const u = q.userByName.get(String(username ?? '').trim().toLowerCase());
      const ok = u ? await verifyPassword(String(password ?? ''), u.pass_hash) : (await verifyPassword('x', await DUMMY_HASH), false);
      if (!ok) { recordFail(ip); throw httpError(401, 'Sai tên đăng nhập hoặc mật khẩu.'); }
      fails.delete(ip);
      return { token: auth.startSession(u.id), user: publicUser(u) };
    },
    startSession(userId) {
      const token = crypto.randomBytes(32).toString('base64url');
      const now = Date.now();
      q.insertSession.run(sha256(token), userId, now, now + ttl, now);
      return token;
    },
    /** Resolve a session token to a user. A session unused for longer than the idle limit is ended;
        otherwise last_seen (and the expiry) slide forward, written at most once a minute. */
    resolve(token) {
      if (!token) return null;
      const h = sha256(token);
      const s = q.session.get(h);
      const now = Date.now();
      if (!s) return null;
      if (s.expires_at < now || (idle && now - s.last_seen > idle)) { q.deleteSession.run(h); return null; }
      if (now - s.last_seen > 60_000) q.touch.run(now, now + ttl, h);
      return publicUser(s);
    },
    logout(token) { if (token) q.deleteSession.run(sha256(token)); },

    purgeExpired() { const now = Date.now(); q.purge.run(now, idle ? now - idle : 0); },
    sessionMaxAge: () => Math.floor(ttl / 1000),
  };
  return auth;
}

export function httpError(status, message, code) {
  const e = new Error(message);
  e.status = status;
  e.code = code || ({ 400: 'invalid_argument', 401: 'unauthenticated', 403: 'permission_denied', 404: 'not_found', 409: 'conflict', 413: 'too_large', 429: 'resource_exhausted' }[status] || 'unavailable');
  return e;
}
