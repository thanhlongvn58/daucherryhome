import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

/** Collections the app may read and write. Anything else is rejected at the API. */
export const COLLECTIONS = ['tx', 'fund', 'deposits', 'vcbf', 'products', 'months', 'config'];
export const ID_RE = /^[A-Za-z0-9_\-.~:@+]{1,200}$/;

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
CREATE TABLE IF NOT EXISTS docs (
  collection TEXT NOT NULL,
  id         TEXT NOT NULL,
  data       TEXT NOT NULL,
  version    INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL,
  updated_by TEXT,
  PRIMARY KEY (collection, id)
);
CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  username   TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name       TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('owner','member','viewer')),
  pass_hash  TEXT NOT NULL,
  color      TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_seen  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS api_tokens (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_used  INTEGER
);
CREATE TABLE IF NOT EXISTS audit (
  at         INTEGER NOT NULL,
  user_id    TEXT,
  action     TEXT NOT NULL,
  collection TEXT,
  doc_id     TEXT
);
`;

const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
export function deepMerge(base, patch) {
  const out = { ...base };
  for (const [k, v] of Object.entries(patch)) out[k] = isObj(v) && isObj(base?.[k]) ? deepMerge(base[k], v) : v;
  return out;
}

export function openStore(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  const file = path.join(dataDir, 'finance.db');
  const db = new DatabaseSync(file);
  db.exec(SCHEMA);

  const q = {
    list: db.prepare('SELECT id, data, version, updated_at, updated_by FROM docs WHERE collection = ? ORDER BY id'),
    get: db.prepare('SELECT id, data, version, updated_at, updated_by FROM docs WHERE collection = ? AND id = ?'),
    upsert: db.prepare(`INSERT INTO docs (collection, id, data, version, updated_at, updated_by) VALUES (?, ?, ?, 1, ?, ?)
      ON CONFLICT(collection, id) DO UPDATE SET data = excluded.data, version = docs.version + 1, updated_at = excluded.updated_at, updated_by = excluded.updated_by`),
    del: db.prepare('DELETE FROM docs WHERE collection = ? AND id = ?'),
    clearAll: db.prepare('DELETE FROM docs'),
    count: db.prepare('SELECT COUNT(*) AS n FROM docs'),
    audit: db.prepare('INSERT INTO audit (at, user_id, action, collection, doc_id) VALUES (?, ?, ?, ?, ?)'),
  };
  const row = r => r && ({ id: r.id, data: JSON.parse(r.data), version: r.version, updatedAt: r.updated_at, updatedBy: r.updated_by });

  function tx(fn) {
    db.exec('BEGIN IMMEDIATE');
    try { const r = fn(); db.exec('COMMIT'); return r; }
    catch (e) { db.exec('ROLLBACK'); throw e; }
  }

  const store = {
    db,
    file,
    list: col => q.list.all(col).map(row),
    get: (col, id) => row(q.get.get(col, id)),
    set(col, id, data, userId = null) {
      q.upsert.run(col, id, JSON.stringify(data), Date.now(), userId);
      q.audit.run(Date.now(), userId, 'set', col, id);
      return store.get(col, id);
    },
    update(col, id, patch, userId = null) {
      return tx(() => {
        const cur = store.get(col, id);
        if (!cur) return null;
        q.upsert.run(col, id, JSON.stringify(deepMerge(cur.data, patch)), Date.now(), userId);
        q.audit.run(Date.now(), userId, 'update', col, id);
        return store.get(col, id);
      });
    },
    remove(col, id, userId = null) {
      const r = q.del.run(col, id);
      q.audit.run(Date.now(), userId, 'delete', col, id);
      return r.changes > 0;
    },
    count: () => q.count.get().n,
    /** Backup in the same shape the app's "Sao lưu (.json)" button produces. */
    exportAll() {
      const out = { exportedAt: new Date().toISOString(), config: store.get('config', 'main')?.data ?? null, months: {} };
      for (const c of ['tx', 'fund', 'deposits', 'vcbf', 'products']) out[c] = store.list(c).map(d => ({ id: d.id, ...d.data }));
      for (const d of store.list('months')) out.months[d.id] = d.data;
      return out;
    },
    /** Replace every finance document with the contents of a backup. Users and sessions are untouched. */
    importAll(backup, userId = null) {
      const docs = backupToDocs(backup);
      tx(() => {
        q.clearAll.run();
        const now = Date.now();
        for (const d of docs) q.upsert.run(d.collection, d.id, JSON.stringify(d.data), now, userId);
        q.audit.run(now, userId, 'import', null, String(docs.length));
      });
      return docs.length;
    },
    backupTo(dest) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      if (fs.existsSync(dest)) fs.rmSync(dest);
      db.exec(`VACUUM INTO '${dest.replace(/'/g, "''")}'`);
      return dest;
    },
    close: () => db.close(),
  };
  return store;
}

/** Validate a backup object and flatten it into documents. Throws with a readable message. */
export function backupToDocs(b) {
  if (!isObj(b)) throw new Error('Tệp sao lưu không hợp lệ.');
  const docs = [];
  const take = (collection, id, data) => {
    if (!ID_RE.test(String(id))) throw new Error(`Mã bản ghi không hợp lệ trong "${collection}": ${id}`);
    if (!isObj(data)) throw new Error(`Bản ghi "${collection}/${id}" không hợp lệ.`);
    docs.push({ collection, id: String(id), data });
  };
  for (const c of ['tx', 'fund', 'deposits', 'vcbf', 'products']) {
    const arr = b[c] ?? [];
    if (!Array.isArray(arr)) throw new Error(`Mục "${c}" phải là danh sách.`);
    for (const item of arr) { const { id, ...data } = item || {}; take(c, id, data); }
  }
  if (b.months != null) { if (!isObj(b.months)) throw new Error('Mục "months" không hợp lệ.'); for (const [id, d] of Object.entries(b.months)) take('months', id, d); }
  if (b.config != null) take('config', 'main', b.config);
  return docs;
}
