import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const bool = (v, d = false) => (v === undefined || v === '' ? d : /^(1|true|yes|on)$/i.test(v));

export function loadConfig(env = process.env, overrides = {}) {
  const publicUrl = (env.PUBLIC_URL || '').replace(/\/+$/, '');
  const cfg = {
    root: ROOT,
    port: Number(env.PORT || 3000),
    host: env.HOST || '0.0.0.0',
    dataDir: path.resolve(ROOT, env.DATA_DIR || 'data'),
    publicDir: path.join(ROOT, 'public'),
    // Full public address, e.g. https://taichinh.giadinh.vn — used for the CSRF origin check and secure cookies.
    publicUrl,
    // Set when running behind Caddy/Nginx/a platform proxy so X-Forwarded-* headers are trusted.
    trustProxy: bool(env.TRUST_PROXY, false),
    cookieSecure: bool(env.COOKIE_SECURE, publicUrl.startsWith('https://')),
    sessionDays: Number(env.SESSION_DAYS || 30),
    backupKeep: Number(env.BACKUP_KEEP || 14),
    backupHours: Number(env.BACKUP_HOURS || 24),
    logRequests: bool(env.LOG_REQUESTS, false),
    // Name announced on the home network: phones open http://<name>.local. Empty = off.
    mdnsName: (env.MDNS_NAME ?? 'taichinh').trim().toLowerCase().replace(/[^a-z0-9-]/g, ''),
    ...overrides,
  };
  return cfg;
}
