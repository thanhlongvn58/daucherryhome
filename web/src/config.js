import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const bool = (v, d = false) => (v === undefined || v === '' ? d : /^(1|true|yes|on)$/i.test(v));
const OFF = /^(|0|off|false|no|none|khong|không)$/i;
/** "~/x" means the user's home folder, so data can live outside the deployed code on managed hosting. */
const expandHome = p => (p === '~' || p.startsWith('~/') || p.startsWith('~\\') ? path.join(os.homedir(), p.slice(1)) : p);

export function loadConfig(env = process.env, overrides = {}) {
  const publicUrl = (env.PUBLIC_URL || '').trim().replace(/\/+$/, '');
  const mdnsRaw = (env.MDNS_NAME ?? 'taichinh').trim();
  const cfg = {
    root: ROOT,
    // A number, or a socket path when a web server such as LiteSpeed starts the app.
    port: /^\d+$/.test(String(env.PORT ?? '').trim()) ? Number(env.PORT) : (String(env.PORT ?? '').trim() || 3000),
    host: env.HOST || '0.0.0.0',
    dataDir: path.resolve(ROOT, expandHome((env.DATA_DIR || 'data').trim())),
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
    // Name announced on the home network: phones open http://<name>.local. "off" (or empty) disables it.
    mdnsName: OFF.test(mdnsRaw) ? '' : mdnsRaw.toLowerCase().replace(/[^a-z0-9-]/g, ''),
    ...overrides,
  };
  return cfg;
}
