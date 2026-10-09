import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';

let app, base, dir;

before(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stc-test-'));
  app = createApp(loadConfig({}, { dataDir: dir, backupHours: 0 }));
  const addr = await app.listen(0, '127.0.0.1');
  base = `http://127.0.0.1:${addr.port}`;
});
after(async () => {
  await app.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

/** Tiny cookie-keeping client. */
function client() {
  let cookie = '';
  return async function call(method, url, body, headers = {}) {
    const r = await fetch(base + url, {
      method,
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json', Origin: base } : method !== 'GET' ? { Origin: base } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const set = r.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const text = await r.text();
    let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: r.status, json, text, headers: r.headers };
  };
}

const owner = client();
const member = client();
const viewer = client();
let memberId;

test('first visit needs setup and API is closed', async () => {
  const s = await client()('GET', '/api/session');
  assert.equal(s.status, 200);
  assert.equal(s.json.needsSetup, true);
  const c = await client()('GET', '/api/c/tx');
  assert.equal(c.status, 401);
});

test('setup creates the owner and rejects a second setup', async () => {
  const r = await owner('POST', '/api/setup', { name: 'Bố Dâu', username: 'Bo.Dau', password: 'mat-khau-dai' });
  assert.equal(r.status, 200);
  assert.equal(r.json.user.role, 'owner');
  assert.equal(r.json.user.username, 'bo.dau');
  assert.match(r.headers.get('set-cookie'), /HttpOnly; SameSite=Lax/);
  const again = await client()('POST', '/api/setup', { name: 'X', username: 'xxx', password: 'mat-khau-dai' });
  assert.equal(again.status, 409);
});

test('security headers are present', async () => {
  const r = await client()('GET', '/');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-security-policy'), /script-src 'self'/);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
});

test('static path traversal is blocked', async () => {
  const r = await fetch(base + '/..%2f..%2fpackage.json');
  assert.notEqual(r.status, 200);
});

test('owner adds a member and a viewer', async () => {
  const m = await owner('POST', '/api/members', { name: 'Mẹ Dâu', username: 'me.dau', password: '12345678', role: 'member' });
  assert.equal(m.status, 200);
  memberId = m.json.member.id;
  const v = await owner('POST', '/api/members', { name: 'Bà ngoại', username: 'ba.ngoai', password: '12345678', role: 'viewer' });
  assert.equal(v.status, 200);
  const dup = await owner('POST', '/api/members', { name: 'Trùng', username: 'ME.DAU', password: '12345678' });
  assert.equal(dup.status, 409);
  const weak = await owner('POST', '/api/members', { name: 'Yếu', username: 'yeu', password: '123' });
  assert.equal(weak.status, 400);
});

test('login works and wrong passwords are rejected', async () => {
  assert.equal((await member('POST', '/api/login', { username: 'me.dau', password: 'sai-mat-khau' })).status, 401);
  assert.equal((await member('POST', '/api/login', { username: 'me.dau', password: '12345678' })).status, 200);
  assert.equal((await viewer('POST', '/api/login', { username: 'ba.ngoai', password: '12345678' })).status, 200);
  const s = await member('GET', '/api/session');
  assert.equal(s.json.user.name, 'Mẹ Dâu');
});

test('member writes documents; viewer can read but not write', async () => {
  const add = await member('POST', '/api/c/tx', { data: { date: '2026-10-09', kind: 'expense', cat: 'food', amount: 250000, note: 'Đi chợ' } });
  assert.equal(add.status, 200);
  const id = add.json.doc.id;
  const list = await viewer('GET', '/api/c/tx');
  assert.equal(list.json.docs.length, 1);
  assert.equal(list.json.docs[0].data.amount, 250000);
  assert.equal(list.json.docs[0].updatedBy, memberId);
  const denied = await viewer('PUT', `/api/d/tx/${id}`, { data: { amount: 1 } });
  assert.equal(denied.status, 403);
  assert.equal((await member('DELETE', `/api/d/tx/${id}`)).status, 200);
  assert.equal((await member('GET', '/api/c/tx')).json.docs.length, 0);
});

test('PATCH deep-merges and requires an existing document', async () => {
  await owner('PUT', '/api/d/config/main', { data: { budgets: { food: 1, kids: 2 }, emergencyTarget: 4 } });
  const r = await owner('PATCH', '/api/d/config/main', { data: { budgets: { food: 9 } } });
  assert.deepEqual(r.json.doc.data, { budgets: { food: 9, kids: 2 }, emergencyTarget: 4 });
  assert.equal(r.json.doc.version, 2);
  assert.equal((await owner('PATCH', '/api/d/config/none', { data: { a: 1 } })).status, 404);
});

test('unknown collections, bad ids and non-JSON bodies are rejected', async () => {
  assert.equal((await owner('GET', '/api/c/users')).status, 404);
  assert.equal((await owner('PUT', '/api/d/tx/bad%20id', { data: {} })).status, 400);
  const r = await owner('PUT', '/api/d/tx/abc', undefined, { 'Content-Type': 'text/plain', Origin: base });
  assert.equal(r.status, 415);
});

test('cross-site requests are blocked', async () => {
  const r = await owner('POST', '/api/c/tx', undefined, { 'Content-Type': 'application/json', Origin: 'https://evil.example' });
  assert.equal(r.status, 403);
});

test('only the owner manages members; members can rename themselves', async () => {
  assert.equal((await member('POST', '/api/members', { name: 'A', username: 'aaa', password: '12345678' })).status, 403);
  assert.equal((await member('PATCH', `/api/members/${memberId}`, { role: 'owner' })).status, 403);
  const self = await member('PATCH', `/api/members/${memberId}`, { name: 'Mẹ Bé Dâu' });
  assert.equal(self.json.member.name, 'Mẹ Bé Dâu');
});

test('changing your own password needs the current one and keeps this session', async () => {
  assert.equal((await member('PATCH', `/api/members/${memberId}`, { currentPassword: 'sai', password: 'mat-khau-moi-1' })).status, 400);
  assert.equal((await member('PATCH', `/api/members/${memberId}`, { currentPassword: '12345678', password: 'mat-khau-moi-1' })).status, 200);
  assert.equal((await member('GET', '/api/c/tx')).status, 200);
  assert.equal((await client()('POST', '/api/login', { username: 'me.dau', password: 'mat-khau-moi-1' })).status, 200);
});

test('export and import round-trip; import is owner-only', async () => {
  const backup = JSON.parse(fs.readFileSync(new URL('./fixtures/sample-backup.json', import.meta.url), 'utf8'));
  assert.equal((await member('POST', '/api/import', { backup })).status, 403);
  const imp = await owner('POST', '/api/import', { backup });
  assert.equal(imp.status, 200);
  assert.equal(imp.json.imported, 9);
  const exp = await owner('GET', '/api/export');
  assert.equal(exp.json.tx.length, 3);
  assert.equal(exp.json.config.navHistory['2025'], 150000000);
  assert.equal(exp.json.products.length, 1);
  const income = exp.json.tx.filter(t => t.kind === 'income').reduce((s, t) => s + t.amount, 0);
  assert.equal(income, 30000000);
  assert.ok(fs.readdirSync(path.join(dir, 'backups')).some(f => f.startsWith('truoc-khi-khoi-phuc')));
  const bad = await owner('POST', '/api/import', { backup: { tx: 'nope' } });
  assert.equal(bad.status, 400);
});

test('the only owner cannot be demoted or deleted', async () => {
  const s = await owner('GET', '/api/session');
  assert.equal((await owner('PATCH', `/api/members/${s.json.user.id}`, { role: 'member' })).status, 400);
  assert.equal((await owner('DELETE', `/api/members/${s.json.user.id}`)).status, 400);
});

test('logout ends the session', async () => {
  assert.equal((await viewer('POST', '/api/logout', {})).status, 200);
  assert.equal((await viewer('GET', '/api/c/tx')).status, 401);
});

test('live stream sends change events', async () => {
  const ctrl = new AbortController();
  const s = await owner('GET', '/api/session');
  assert.ok(s.json.user);
  const cookieClient = client();
  await cookieClient('POST', '/api/login', { username: 'bo.dau', password: 'mat-khau-dai' });
  // open stream with a fresh login cookie
  const login = await fetch(base + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ username: 'bo.dau', password: 'mat-khau-dai' }) });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const res = await fetch(base + '/api/stream', { headers: { Cookie: cookie }, signal: ctrl.signal });
  assert.equal(res.headers.get('content-type'), 'text/event-stream; charset=utf-8');
  const reader = res.body.getReader();
  await reader.read(); // retry: line
  await owner('PUT', '/api/d/months/2026-10', { data: { note: 'thử' } });
  let got = '';
  while (!got.includes('event: change')) got += new TextDecoder().decode((await reader.read()).value);
  assert.match(got, /"collection":"months"/);
  ctrl.abort();
});

test('iPhone shortcut tokens: summary, quick add, scope and revoke', async () => {
  const created = await owner('POST', '/api/tokens', { name: 'iPhone của Bố' });
  assert.equal(created.status, 200);
  const tok = created.json.token;
  assert.match(tok, /^stc_/);
  assert.equal((await owner('GET', '/api/tokens')).json.tokens[0].name, 'iPhone của Bố');
  const bearer = { Authorization: `Bearer ${tok}` };
  const raw = (method, path, body, headers = {}) => fetch(base + path, { method, headers: { ...headers, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });

  const sum = await raw('GET', '/api/shortcut/summary', undefined, bearer);
  assert.equal(sum.status, 200);
  assert.match(sum.headers.get('content-type'), /text\/plain/);
  const sumText = await sum.text();
  assert.match(sumText, /Sổ Tài Chính[\s\S]*Tài sản ròng/);
  // fixture: savings 100tr + emergency 25tr + fund 1.000 CCQ × 10.500 = 135,5tr (catches a portfolio priced at 0)
  assert.match(sumText, /Tài sản ròng: 135,5 tr/);

  const none = await raw('GET', '/api/shortcut/summary');
  assert.equal(none.status, 401);
  assert.match(await none.text(), /^Lỗi: Thiếu mã phím tắt/);
  assert.equal((await raw('GET', '/api/shortcut/summary', undefined, { Authorization: 'Bearer stc_sai' })).status, 401);

  const before = (await owner('GET', '/api/c/tx')).json.docs.length;
  const add = await raw('POST', '/api/shortcut/add', { danh_muc: 'ăn sáng', so_tien: '250k', ghi_chu: 'Phở' }, bearer);
  assert.equal(add.status, 200);
  assert.match(await add.text(), /^Đã ghi Ăn uống & sinh hoạt −250\.000 ₫/);
  const form = await fetch(base + '/api/shortcut/add', { method: 'POST', headers: { ...bearer, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'loai=thu&danh_muc=thưởng&so_tien=1000000' });
  assert.equal(form.status, 200);
  const docs = (await owner('GET', '/api/c/tx')).json.docs;
  assert.equal(docs.length, before + 2);
  assert.ok(docs.some(d => d.data.cat === 'bonus' && d.data.kind === 'income' && d.data.amount === 1000000));

  const bad = await raw('POST', '/api/shortcut/add', { danh_muc: 'xyz', so_tien: 100000 }, bearer);
  assert.equal(bad.status, 400);
  assert.match(await bad.text(), /Không nhận ra danh mục/);
  // a shortcut token only opens the shortcut endpoints
  assert.equal((await raw('GET', '/api/c/tx', undefined, bearer)).status, 401);

  // read-only members cannot add through a shortcut
  const v = client();
  await v('POST', '/api/login', { username: 'ba.ngoai', password: '12345678' });
  const vt = (await v('POST', '/api/tokens', { name: 'iPad' })).json.token;
  assert.equal((await raw('POST', '/api/shortcut/add', { danh_muc: 'xăng', so_tien: 50000 }, { Authorization: `Bearer ${vt}` })).status, 403);

  const id = (await owner('GET', '/api/tokens')).json.tokens[0].id;
  assert.equal((await owner('DELETE', `/api/tokens/${id}`)).status, 200);
  assert.equal((await raw('GET', '/api/shortcut/summary', undefined, bearer)).status, 401);
});
