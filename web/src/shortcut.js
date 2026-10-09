// Server-side helpers for the iPhone Shortcuts app: a plain-text summary and a quick "add expense".
// Figures follow the same rules as the web app (monthly records, fund ledgers, portfolio, net worth).
import crypto from 'node:crypto';

export const CATS = [
  { id: 'mgmt', name: 'Phí quản lý' },
  { id: 'util', name: 'Điện, nước, wifi' },
  { id: 'helper', name: 'Giúp việc, dọn dẹp' },
  { id: 'transport', name: 'Đi lại' },
  { id: 'food', name: 'Ăn uống & sinh hoạt' },
  { id: 'other', name: 'Mua sắm, sửa chữa' },
  { id: 'kids', name: 'Bỉm sữa, khám cho con' },
];
const INCOME = [
  { id: 'income', name: 'Thu nhập tháng' }, { id: 'salary', name: 'Lương' },
  { id: 'bonus', name: 'Thưởng' }, { id: 'side', name: 'Thu nhập phụ' },
];
const TZ = process.env.TZ_APP || 'Asia/Ho_Chi_Minh';

const noAccent = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const nf = new Intl.NumberFormat('vi-VN');
const vnd = n => nf.format(Math.round(n || 0));
function compact(n) {
  n = +n || 0; const a = Math.abs(n), s = n < 0 ? '−' : '';
  if (a >= 1e9) return s + (a / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' tỷ';
  if (a >= 1e6) return s + (a / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' tr';
  if (a >= 1e3) return s + Math.round(a / 1e3) + 'k';
  return s + Math.round(a);
}
const pctTxt = x => (isFinite(x) ? (x * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + '%' : '—');
/** Today's date in Vietnam (YYYY-MM-DD), whatever the server's own time zone is. */
export function todayVN(d = new Date()) { return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d); }
const dmy = iso => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** Accepts 250000, "250.000", "250k", "1tr2", "2,5tr", "150k+80k". */
export function parseAmount(v) {
  if (typeof v === 'number') return Number.isFinite(v) && v > 0 ? Math.round(v) : NaN;
  const s = String(v ?? '').toLowerCase().replace(/\s+/g, '').replace(/₫|vnđ|vnd|đ/g, '');
  if (!s) return NaN;
  const units = { 'tỷ': 1e9, ty: 1e9, 'triệu': 1e6, trieu: 1e6, tr: 1e6, m: 1e6, 'nghìn': 1e3, nghin: 1e3, k: 1e3 };
  let total = 0;
  for (const p of s.split('+')) {
    const m = p.match(/^(\d+(?:[.,]\d+)?)(tỷ|ty|triệu|trieu|tr|m|nghìn|nghin|k)(\d*)$/);
    if (m) { const u = units[m[2]]; total += parseFloat(m[1].replace(',', '.')) * u + (m[3] ? parseFloat('0.' + m[3]) * u : 0); continue; }
    if (/^\d{1,3}([.,]\d{3})+$/.test(p) || /^\d+$/.test(p)) { total += parseInt(p.replace(/[.,]/g, ''), 10); continue; }
    return NaN;
  }
  return total > 0 ? Math.round(total) : NaN;
}
/* Everyday words people may type or dictate; matched as whole words, longest phrase first
   (so "sửa chữa" → Mua sắm, sửa chữa, while "sữa" → Bỉm sữa). */
const KEYWORDS = {
  mgmt: ['phi quan ly', 'quan ly', 'chung cu', 'phi dich vu'],
  util: ['dien nuoc', 'dien', 'nuoc', 'wifi', 'internet', 'mang', 'gas'],
  helper: ['giup viec', 'don dep', 'giup', 'osin'],
  transport: ['di lai', 'xang', 'xe', 'taxi', 'grab', 'gui xe', 've may bay'],
  food: ['an uong', 'sinh hoat', 'an', 'uong', 'cho', 'sieu thi', 'com', 'cafe'],
  other: ['mua sam', 'sua chua', 'noi that', 'khac', 'mua', 'do dung'],
  kids: ['bim sua', 'bim', 'sua', 'kham benh', 'kham', 'thuoc', 'con', 'be', 'hoc phi'],
  income: ['thu nhap', 'thu'], salary: ['luong'], bonus: ['thuong'], side: ['thu nhap phu', 'lam them', 'phu'],
};
function matchCategory(input, list) {
  const n = noAccent(input); if (!n) return null;
  const exact = list.find(c => c.id === n || noAccent(c.name) === n); if (exact) return exact;
  const padded = ` ${n} `;
  const pairs = list.flatMap(c => (KEYWORDS[c.id] || []).map(kw => ({ c, kw }))).sort((a, b) => b.kw.length - a.kw.length);
  return (pairs.find(p => padded.includes(` ${p.kw} `)) || {}).c || null;
}

function monthTotals(txs, ym) {
  const r = { income: 0, exp: 0, cats: {} };
  for (const t of txs) {
    if (!String(t.date || '').startsWith(ym)) continue;
    const a = +t.amount || 0;
    if (t.kind === 'income') r.income += a; else { r.exp += a; const c = CATS.some(x => x.id === t.cat) ? t.cat : 'other'; r.cats[c] = (r.cats[c] || 0) + a; }
  }
  return r;
}
function fundBalance(cfg, fund, f) { let b = +cfg.openings?.[f] || 0; for (const e of fund) if (e.fund === f) b += e.type === 'out' ? -(+e.amount || 0) : (+e.amount || 0); return b; }
function portfolioValue(products, lots, cfg) {
  const price = id => { const p = products.find(x => x.id === id); return p ? +p.price || 0 : +cfg.vcbfPrice || 0; };
  const units = {};
  for (const l of lots) { const id = l.product || 'vcbf-mgf'; units[id] = (units[id] || 0) + (l.side === 'sell' ? -(+l.units || 0) : (+l.units || 0)); }
  return Object.entries(units).reduce((s, [id, u]) => s + Math.max(0, u) * price(id), 0);
}

export function buildSummary(store, now = new Date()) {
  const data = c => store.list(c).map(d => d.data);
  const tx = data('tx'), fund = data('fund'), cfg = store.get('config', 'main')?.data || {};
  const today = todayVN(now), y = +today.slice(0, 4), m = +today.slice(5, 7), ym = today.slice(0, 7);
  const cur = monthTotals(tx, ym);
  const year = { income: 0, exp: 0 }; for (let k = 1; k <= 12; k++) { const t = monthTotals(tx, `${y}-${String(k).padStart(2, '0')}`); year.income += t.income; year.exp += t.exp; }
  // rolling average of the last 12 months that have expenses (same as the app)
  const exps = []; let yy = y, mm = m + 1;
  for (let k = 0; k < 12; k++) { mm--; if (mm < 1) { mm = 12; yy--; } const t = monthTotals(tx, `${yy}-${String(mm).padStart(2, '0')}`); if (t.exp > 0) exps.push(t.exp); }
  const avgExp = exps.length ? exps.reduce((a, b) => a + b, 0) / exps.length : 0;
  const savings = fundBalance(cfg, fund, 'savings'), emergency = fundBalance(cfg, fund, 'emergency');
  const products = store.list('products').map(d => ({ id: d.id, ...d.data }));   // the id lives on the document, not in its data
  const kids = portfolioValue(products, data('vcbf'), cfg), risk = +cfg.highRisk || 0;
  const nav = savings + emergency + kids + risk;
  const sur = cur.income - cur.exp;
  const top = Object.entries(cur.cats).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, v]) => `${CATS.find(c => c.id === id).name} ${compact(v)}`);
  const lines = [
    `Sổ Tài Chính · ${dmy(today)}`,
    `Tháng ${m}: thu ${compact(cur.income)} · chi ${compact(cur.exp)} · ${sur >= 0 ? 'dư' : 'âm'} ${compact(Math.abs(sur))}${cur.income ? ` (tiết kiệm ${pctTxt(sur / cur.income)})` : ''}`,
    top.length ? `Chi nhiều nhất: ${top.join(', ')}` : `Tháng ${m} chưa có khoản chi nào.`,
    `Năm ${y}: thu ${compact(year.income)} · chi ${compact(year.exp)}${year.income ? ` · tiết kiệm ${pctTxt((year.income - year.exp) / year.income)}` : ''}`,
    `Quỹ khẩn cấp: ${compact(emergency)}${avgExp ? ` (đủ ${(emergency / avgExp).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tháng chi tiêu)` : ''}`,
    `Tài sản ròng: ${compact(nav)}`,
  ];
  return { text: lines.join('\n'), data: { date: today, month: { ...cur, surplus: sur }, year, emergency, savings, kids, risk, nav } };
}

/** Add one income/expense record from a shortcut. Returns the stored doc and a confirmation sentence. */
export function addFromShortcut(store, user, body) {
  const kindRaw = noAccent(body.loai ?? body.kind ?? 'chi');
  const isIncome = ['thu', 'income', 'thu nhap'].includes(kindRaw);
  const amount = parseAmount(body.so_tien ?? body.amount);
  if (!(amount > 0)) { const e = new Error('Số tiền chưa hợp lệ. Ví dụ: 250000 hoặc 250k.'); e.status = 400; throw e; }
  const list = isIncome ? INCOME : CATS;
  const catIn = body.danh_muc ?? body.cat ?? (isIncome ? 'income' : '');
  const cat = matchCategory(catIn, list);
  if (!cat) { const e = new Error(`Không nhận ra danh mục "${catIn}". Dùng một trong: ${list.map(c => c.name).join('; ')}.`); e.status = 400; throw e; }
  const date = /^\d{4}-\d{2}-\d{2}$/.test(body.ngay || '') ? body.ngay : todayVN();
  const note = String(body.ghi_chu ?? body.note ?? '').trim().slice(0, 200);
  const id = crypto.randomBytes(10).toString('base64url');
  const doc = store.set('tx', id, { date, kind: isIncome ? 'income' : 'expense', cat: cat.id, amount, note, by: user.id, at: Date.now(), src: 'shortcut' }, user.id);
  const mt = monthTotals(store.list('tx').map(d => d.data), date.slice(0, 7));
  const message = `Đã ghi ${cat.name} ${isIncome ? '+' : '−'}${vnd(amount)} ₫ (${dmy(date)})${note ? ` · ${note}` : ''}.\nTháng ${+date.slice(5, 7)}: thu ${compact(mt.income)} · chi ${compact(mt.exp)}${mt.income ? ` (${pctTxt(mt.exp / mt.income)} thu nhập)` : ''}.`;
  return { doc, message };
}
