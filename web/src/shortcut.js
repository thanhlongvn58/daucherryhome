// Server-side helpers for the iPhone Shortcuts app: a plain-text summary and a quick "add expense".
// Figures follow the same rules as the web app (monthly records, fund ledgers, portfolio, net worth).
// Answers come in Vietnamese by default, or in English / Japanese with ?lang=en|ja (chosen in the app's Settings).
import crypto from 'node:crypto';

export const CATS = [
  { id: 'mgmt', name: 'Phí quản lý', en: 'Management fees', ja: '管理費' },
  { id: 'util', name: 'Điện, nước, wifi', en: 'Utilities & Wi-Fi', ja: '光熱費・通信費' },
  { id: 'helper', name: 'Giúp việc, dọn dẹp', en: 'Housekeeping', ja: '家事代行・清掃' },
  { id: 'transport', name: 'Đi lại', en: 'Transport', ja: '交通費' },
  { id: 'food', name: 'Ăn uống & sinh hoạt', en: 'Food & household', ja: '食費・日用品' },
  { id: 'other', name: 'Mua sắm, sửa chữa', en: 'Shopping & repairs', ja: '買い物・修理' },
  { id: 'kids', name: 'Bỉm sữa, khám cho con', en: "Baby care & kids' health", ja: '育児用品・子どもの医療' },
];
const INCOME = [
  { id: 'income', name: 'Thu nhập tháng', en: 'Monthly income', ja: '月収' },
  { id: 'salary', name: 'Lương', en: 'Salary', ja: '給与' },
  { id: 'bonus', name: 'Thưởng', en: 'Bonus', ja: '賞与' },
  { id: 'side', name: 'Thu nhập phụ', en: 'Side income', ja: '副収入' },
];
const TZ = process.env.TZ_APP || 'Asia/Ho_Chi_Minh';

/* ---------- language ---------- */
export const shortcutLang = v => (v === 'en' || v === 'ja' ? v : 'vi');
const LOCALE = { vi: 'vi-VN', en: 'en-US', ja: 'ja-JP' };
const catName = (c, lang) => (lang === 'vi' ? c.name : c[lang]);
/* Vietnamese text → [English, Japanese]; {name} placeholders are filled in by tr(). */
const TEXT = {
  'Sổ Tài Chính · {date}': ['Family Finance · {date}', '家計簿 · {date}'],
  'Tháng {m}: thu {inc} · chi {exp} · dư {sur}': ['{month}: income {inc} · spending {exp} · surplus {sur}', '{m}月：収入 {inc} · 支出 {exp} · 黒字 {sur}'],
  'Tháng {m}: thu {inc} · chi {exp} · âm {sur}': ['{month}: income {inc} · spending {exp} · deficit {sur}', '{m}月：収入 {inc} · 支出 {exp} · 赤字 {sur}'],
  ' (tiết kiệm {p})': [' (saved {p})', '（貯蓄率 {p}）'],
  'Chi nhiều nhất: {list}': ['Top spending: {list}', '支出の多い項目：{list}'],
  'Tháng {m} chưa có khoản chi nào.': ['No spending recorded for {month} yet.', '{m}月の支出はまだありません。'],
  'Năm {y}: thu {inc} · chi {exp}': ['{y}: income {inc} · spending {exp}', '{y}年：収入 {inc} · 支出 {exp}'],
  ' · tiết kiệm {p}': [' · saved {p}', ' · 貯蓄率 {p}'],
  'Quỹ khẩn cấp: {v}': ['Emergency fund: {v}', '生活防衛資金：{v}'],
  ' (đủ {n} tháng chi tiêu)': [' (covers {n} months of spending)', '（支出{n}か月分）'],
  'Tài sản ròng: {v}': ['Net worth: {v}', '純資産：{v}'],
  'Đã ghi {cat} {amt} ₫ ({date}){note}.': ['Recorded {cat} {amt} ₫ ({date}){note}.', '{cat} {amt} ₫ を記録しました（{date}）{note}。'],
  'Tháng {m}: thu {inc} · chi {exp}': ['{month}: income {inc} · spending {exp}', '{m}月：収入 {inc} · 支出 {exp}'],
  ' ({p} thu nhập)': [' ({p} of income)', '（収入の{p}）'],
  'Số tiền chưa hợp lệ. Ví dụ: 250000 hoặc 250k.': ['Invalid amount. Example: 250000 or 250k.', '金額が正しくありません。例：250000 または 25万'],
  'Không nhận ra danh mục "{cat}". Dùng một trong: {list}.': ['Unknown category "{cat}". Use one of: {list}.', 'カテゴリ「{cat}」を認識できません。次のいずれかを使ってください：{list}。'],
  'Mã phím tắt không đúng hoặc đã bị thu hồi. Tạo mã mới trong Thiết lập › Phím tắt iPhone.': ['The shortcut code is wrong or has been revoked. Create a new one in Settings › iPhone Shortcuts.', 'ショートカット用コードが正しくないか、無効化されています。「設定」›「iPhoneのショートカット」で新しいコードを作成してください。'],
  'Thiếu mã phím tắt. Thêm tiêu đề Authorization: Bearer <mã> trong Phím tắt.': ['Missing shortcut code. Add the header Authorization: Bearer <code> in Shortcuts.', 'ショートカット用コードがありません。ショートカットにヘッダ Authorization: Bearer <コード> を追加してください。'],
  'Bạn không có quyền thực hiện thao tác này.': ["You don't have permission to do this.", 'この操作を行う権限がありません。'],
  'Máy chủ gặp lỗi. Thử lại sau.': ['Server error. Try again later.', 'サーバーエラーが発生しました。しばらくしてからお試しください。'],
  'Lỗi: ': ['Error: ', 'エラー：'],
};
const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function tr(lang, s, vars = {}) {
  const out = lang === 'vi' ? s : (TEXT[s] ? TEXT[s][lang === 'en' ? 0 : 1] : s);
  return out.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}
/** Translates an error message that the shortcut endpoints send back. */
export const shortcutMessage = (lang, msg) => tr(lang, msg);

const noAccent = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
function fmtNum(n, lang, maxFrac = 0) { return (+n || 0).toLocaleString(LOCALE[lang], { maximumFractionDigits: maxFrac }); }
const vnd = (n, lang = 'vi') => fmtNum(Math.round(n || 0), lang);
function compact(n, lang = 'vi') {
  n = +n || 0; const a = Math.abs(n), s = n < 0 ? '−' : '';
  if (lang === 'ja') {
    if (a >= 1e8) return s + fmtNum(a / 1e8, lang, 2) + '億';
    if (a >= 1e4) { const v = a / 1e4; return s + fmtNum(v, lang, v >= 100 ? 0 : 1) + '万'; }
    return s + fmtNum(a, lang);
  }
  if (lang === 'en') {
    if (a >= 1e9) return s + fmtNum(a / 1e9, lang, 2) + 'B';
    if (a >= 1e6) return s + fmtNum(a / 1e6, lang, 1) + 'M';
    if (a >= 1e3) return s + Math.round(a / 1e3) + 'K';
    return s + Math.round(a);
  }
  if (a >= 1e9) return s + fmtNum(a / 1e9, lang, 2) + ' tỷ';
  if (a >= 1e6) return s + fmtNum(a / 1e6, lang, 1) + ' tr';
  if (a >= 1e3) return s + Math.round(a / 1e3) + 'k';
  return s + Math.round(a);
}
const pctTxt = (x, lang = 'vi') => (isFinite(x) ? fmtNum(x * 100, lang, 1) + '%' : '—');
/** Today's date in Vietnam (YYYY-MM-DD), whatever the server's own time zone is. */
export function todayVN(d = new Date()) { return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d); }
const dmy = iso => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** Accepts 250000, "250.000", "250,000", "250k", "1tr2", "2,5tr", "2.5m", "25万", "1億2000万", "150k+80k". */
export function parseAmount(v) {
  if (typeof v === 'number') return Number.isFinite(v) && v > 0 ? Math.round(v) : NaN;
  const s = String(v ?? '').toLowerCase().replace(/\s+/g, '').replace(/₫|vnđ|vnd|đ|ドン/g, '');
  if (!s) return NaN;
  const units = { 'tỷ': 1e9, ty: 1e9, bn: 1e9, b: 1e9, 'triệu': 1e6, trieu: 1e6, tr: 1e6, m: 1e6, 'nghìn': 1e3, nghin: 1e3, k: 1e3, '億': 1e8, '万': 1e4, '千': 1e3 };
  const tok = /(\d+(?:[.,]\d+)?)(tỷ|ty|bn|b|triệu|trieu|tr|m|nghìn|nghin|k|億|万|千)/y;
  let total = 0;
  for (const p of s.split('+')) {
    if (/^\d{1,3}([.,]\d{3})+$/.test(p) || /^\d+$/.test(p)) { total += parseInt(p.replace(/[.,]/g, ''), 10); continue; }
    tok.lastIndex = 0; let m, n = 0, last = 0, val = 0, lastUnit = 0;
    while ((m = tok.exec(p))) { lastUnit = units[m[2]]; val += parseFloat(m[1].replace(',', '.')) * lastUnit; last = tok.lastIndex; n++; }
    if (!n) return NaN;
    const rest = p.slice(last);
    if (rest) {
      if (!/^\d+$/.test(rest)) return NaN;
      if (n === 1 && !/[億万千]/.test(p)) val += parseFloat('0.' + rest) * lastUnit; else val += +rest;
    }
    total += val;
  }
  return total > 0 ? Math.round(total) : NaN;
}
/* Everyday words people may type or dictate; matched as whole words, longest phrase first
   (so "sửa chữa" → Mua sắm, sửa chữa, while "sữa" → Bỉm sữa). English words share the list. */
const KEYWORDS = {
  mgmt: ['phi quan ly', 'quan ly', 'chung cu', 'phi dich vu', 'management fees', 'management fee', 'management', 'service fee'],
  util: ['dien nuoc', 'dien', 'nuoc', 'wifi', 'internet', 'mang', 'gas', 'utilities', 'utility', 'electricity', 'water', 'power', 'phone'],
  helper: ['giup viec', 'don dep', 'giup', 'osin', 'housekeeping', 'helper', 'cleaning', 'maid', 'nanny'],
  transport: ['di lai', 'xang', 'xe', 'taxi', 'grab', 'gui xe', 've may bay', 'transport', 'transportation', 'fuel', 'petrol', 'parking', 'flight', 'car', 'bus'],
  food: ['an uong', 'sinh hoat', 'an', 'uong', 'cho', 'sieu thi', 'com', 'cafe', 'food', 'groceries', 'grocery', 'household', 'dining', 'restaurant', 'coffee', 'eating'],
  other: ['mua sam', 'sua chua', 'noi that', 'khac', 'mua', 'do dung', 'shopping', 'repairs', 'repair', 'furniture', 'other', 'misc'],
  kids: ['bim sua', 'bim', 'sua', 'kham benh', 'kham', 'thuoc', 'con', 'be', 'hoc phi', 'kids', 'kid', 'baby', 'diapers', 'milk', 'doctor', 'medicine', 'school', 'tuition'],
  income: ['thu nhap', 'thu', 'income'], salary: ['luong', 'salary', 'wage', 'wages'], bonus: ['thuong', 'bonus'], side: ['thu nhap phu', 'lam them', 'phu', 'side income', 'side', 'freelance'],
};
/* Japanese has no spaces, so these are matched as substrings of the raw text (longest first). */
const KEYWORDS_JA = {
  mgmt: ['管理費', '管理', '共益費'],
  util: ['光熱費', '通信費', '電気', '水道', 'ガス', 'ネット', '携帯'],
  helper: ['家事代行', '家事', '清掃', '掃除', 'ベビーシッター'],
  transport: ['交通費', '交通', 'ガソリン', 'タクシー', '駐車', '電車', '飛行機'],
  food: ['食費', '日用品', '外食', '食事', 'スーパー', 'カフェ', 'ご飯'],
  other: ['買い物', '修理', '家具', 'その他'],
  kids: ['育児', '子ども', '子供', 'おむつ', 'ミルク', '通院', '病院', '薬', '学費'],
  income: ['収入', '月収'], salary: ['給与', '給料'], bonus: ['賞与', 'ボーナス'], side: ['副収入', '副業'],
};
function matchCategory(input, list) {
  const raw = String(input ?? '').trim(); if (!raw) return null;
  const exact = list.find(c => c.id === raw.toLowerCase() || c.name === raw || c.en.toLowerCase() === raw.toLowerCase() || c.ja === raw); if (exact) return exact;
  const ja = list.flatMap(c => (KEYWORDS_JA[c.id] || []).map(kw => ({ c, kw }))).sort((a, b) => b.kw.length - a.kw.length).find(p => raw.includes(p.kw));
  if (ja) return ja.c;
  const n = noAccent(raw); if (!n) return null;
  const byName = list.find(c => noAccent(c.name) === n || noAccent(c.en) === n); if (byName) return byName;
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

export function buildSummary(store, now = new Date(), lang = 'vi') {
  lang = shortcutLang(lang);
  const C = n => compact(n, lang), P = x => pctTxt(x, lang);
  const data = c => store.list(c).map(d => d.data);
  const tx = data('tx'), fund = data('fund'), cfg = store.get('config', 'main')?.data || {};
  const today = todayVN(now), y = +today.slice(0, 4), m = +today.slice(5, 7), ym = today.slice(0, 7);
  const month = EN_MONTHS[m - 1];
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
  const top = Object.entries(cur.cats).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, v]) => `${catName(CATS.find(c => c.id === id), lang)} ${C(v)}`);
  const lines = [
    tr(lang, 'Sổ Tài Chính · {date}', { date: dmy(today) }),
    tr(lang, sur >= 0 ? 'Tháng {m}: thu {inc} · chi {exp} · dư {sur}' : 'Tháng {m}: thu {inc} · chi {exp} · âm {sur}', { m, month, inc: C(cur.income), exp: C(cur.exp), sur: C(Math.abs(sur)) })
      + (cur.income ? tr(lang, ' (tiết kiệm {p})', { p: P(sur / cur.income) }) : ''),
    top.length ? tr(lang, 'Chi nhiều nhất: {list}', { list: top.join(lang === 'ja' ? '、' : ', ') }) : tr(lang, 'Tháng {m} chưa có khoản chi nào.', { m, month }),
    tr(lang, 'Năm {y}: thu {inc} · chi {exp}', { y, inc: C(year.income), exp: C(year.exp) }) + (year.income ? tr(lang, ' · tiết kiệm {p}', { p: P((year.income - year.exp) / year.income) }) : ''),
    tr(lang, 'Quỹ khẩn cấp: {v}', { v: C(emergency) }) + (avgExp ? tr(lang, ' (đủ {n} tháng chi tiêu)', { n: fmtNum(emergency / avgExp, lang, 1) }) : ''),
    tr(lang, 'Tài sản ròng: {v}', { v: C(nav) }),
  ];
  return { text: lines.join('\n'), data: { date: today, month: { ...cur, surplus: sur }, year, emergency, savings, kids, risk, nav } };
}

/** Add one income/expense record from a shortcut. Returns the stored doc and a confirmation sentence. */
export function addFromShortcut(store, user, body, lang = 'vi') {
  lang = shortcutLang(body.lang || lang);
  const kindIn = String(body.loai ?? body.kind ?? 'chi').trim();
  const kindRaw = noAccent(kindIn);
  const isIncome = ['thu', 'income', 'thu nhap', 'in'].includes(kindRaw) || ['収入', '入金'].includes(kindIn);
  const amount = parseAmount(body.so_tien ?? body.amount);
  if (!(amount > 0)) { const e = new Error('Số tiền chưa hợp lệ. Ví dụ: 250000 hoặc 250k.'); e.status = 400; throw e; }
  const list = isIncome ? INCOME : CATS;
  const catIn = body.danh_muc ?? body.cat ?? body.category ?? (isIncome ? 'income' : '');
  const cat = matchCategory(catIn, list);
  if (!cat) { const e = new Error(tr(lang, 'Không nhận ra danh mục "{cat}". Dùng một trong: {list}.', { cat: catIn, list: list.map(c => catName(c, lang)).join('; ') })); e.status = 400; e.translated = true; throw e; }
  const date = /^\d{4}-\d{2}-\d{2}$/.test(body.ngay || '') ? body.ngay : todayVN();
  const note = String(body.ghi_chu ?? body.note ?? '').trim().slice(0, 200);
  const id = crypto.randomBytes(10).toString('base64url');
  const doc = store.set('tx', id, { date, kind: isIncome ? 'income' : 'expense', cat: cat.id, amount, note, by: user.id, at: Date.now(), src: 'shortcut' }, user.id);
  const mt = monthTotals(store.list('tx').map(d => d.data), date.slice(0, 7));
  const m = +date.slice(5, 7);
  const message = tr(lang, 'Đã ghi {cat} {amt} ₫ ({date}){note}.', { cat: catName(cat, lang), amt: (isIncome ? '+' : '−') + vnd(amount, lang), date: dmy(date), note: note ? ` · ${note}` : '' })
    + '\n' + tr(lang, 'Tháng {m}: thu {inc} · chi {exp}', { m, month: EN_MONTHS[m - 1], inc: compact(mt.income, lang), exp: compact(mt.exp, lang) })
    + (mt.income ? tr(lang, ' ({p} thu nhập)', { p: pctTxt(mt.exp / mt.income, lang) }) : '') + (lang === 'ja' ? '' : '.');
  return { doc, message };
}
