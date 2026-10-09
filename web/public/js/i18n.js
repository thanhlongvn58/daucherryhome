/* Interface language: Tiếng Việt (default) / English / 日本語.
   Loaded synchronously in <head> after i18n-dict.js. Texts are written in Vietnamese in the code and looked up
   in the dictionary (window.STC_I18N_DICT: vi → [en, ja]); anything missing falls back to Vietnamese.
   Dates stay DD/MM/YYYY in every language (family rule); numbers and money follow each language's habits. */
(function () {
  'use strict';
  var KEY = 'stc.lang';
  var LANGS = {
    vi: { name: 'Tiếng Việt', short: 'VI', locale: 'vi-VN' },
    en: { name: 'English', short: 'EN', locale: 'en-US' },
    ja: { name: '日本語', short: 'JA', locale: 'ja-JP' },
  };
  var DICT = window.STC_I18N_DICT || {};
  function read() { try { var v = localStorage.getItem(KEY); if (LANGS[v]) return v; } catch (e) { /* private mode */ } return 'vi'; }
  var lang = read();
  var nf = null;

  /* ---------- text ---------- */
  /** t('Còn {n} ngày', {n: 5}). In translations `{n:day|days}` picks singular/plural from the value of n. */
  function t(s, vars) {
    var out = s;
    if (lang !== 'vi') { var e = DICT[s]; if (e && e[lang === 'en' ? 0 : 1] != null) out = e[lang === 'en' ? 0 : 1]; }
    if (vars) {
      out = out.replace(/\{(\w+):([^|{}]*)\|([^{}]*)\}/g, function (m, k, one, many) { return k in vars ? (+vars[k] === 1 ? one : many) : m; });
      out = out.replace(/\{(\w+)\}/g, function (m, k) { return k in vars ? vars[k] : m; });
    }
    return out;
  }
  /** Server error messages arrive in Vietnamese; translate the known ones. */
  function tMsg(s) { return lang === 'vi' || !s ? s : t(String(s)); }

  /* ---------- numbers ---------- */
  function locale() { return LANGS[lang].locale; }
  function numFmt() { if (!nf) nf = new Intl.NumberFormat(locale()); return nf; }
  function int(n) { return numFmt().format(Math.round(n || 0)); }
  function num(x, maxFrac, minFrac) { return (+x || 0).toLocaleString(locale(), { maximumFractionDigits: maxFrac == null ? 2 : maxFrac, minimumFractionDigits: minFrac || 0 }); }
  /** Short money: vi 6,44 tỷ · 385,6 tr · 250k — en 6.44B · 385.6M · 250K — ja 64.4億 · 3,856万. */
  function compact(n) {
    n = +n || 0; var a = Math.abs(n), s = n < 0 ? '−' : '';
    if (lang === 'ja') {
      if (a >= 1e8) return s + num(a / 1e8, 2) + '億';
      if (a >= 1e4) { var v = a / 1e4; return s + num(v, v >= 100 ? 0 : 1) + '万'; }
      return s + int(a);
    }
    if (lang === 'en') {
      if (a >= 1e9) return s + num(a / 1e9, 2) + 'B';
      if (a >= 1e6) return s + num(a / 1e6, 1) + 'M';
      if (a >= 1e3) return s + Math.round(a / 1e3) + 'K';
      return s + Math.round(a);
    }
    if (a >= 1e9) return s + num(a / 1e9, 2) + ' tỷ';
    if (a >= 1e6) return s + num(a / 1e6, 1) + ' tr';
    if (a >= 1e3) return s + Math.round(a / 1e3) + 'k';
    return s + Math.round(a);
  }
  /** Decimal shown inside an input (vi uses a decimal comma). */
  function decIn(x) { var s = String(x == null ? '' : x); return lang === 'vi' ? s.replace('.', ',') : s; }
  /** Reads "13732,75" (vi) or "13,732.75" (en/ja). */
  function parseDecimal(str) {
    var s = String(str == null ? '' : str).trim().replace(/\s/g, ''); if (!s) return NaN;
    if (lang === 'vi') { if (/,\d+$/.test(s)) return parseFloat(s.replace(/\./g, '').replace(',', '.')); return parseFloat(s.replace(/,/g, '')); }
    if (s.indexOf('.') >= 0) return parseFloat(s.replace(/,/g, ''));
    if (/^\d{1,3}(,\d{3})+$/.test(s)) return parseFloat(s.replace(/,/g, ''));
    return parseFloat(s.replace(',', '.'));
  }

  /* ---------- months ---------- */
  var EN_M = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  /** Heading form: Tháng 10/2026 · October 2026 · 2026年10月 */
  function monthLabel(y, m) { return lang === 'en' ? EN_M[m - 1] + ' ' + y : lang === 'ja' ? y + '年' + m + '月' : 'Tháng ' + m + '/' + y; }
  /** In-sentence form: tháng 10/2026 · October 2026 · 2026年10月 */
  function monthIn(y, m) { return lang === 'vi' ? 'tháng ' + m + '/' + y : monthLabel(y, m); }
  /** Axis / column form: T10 · Oct · 10月 */
  function mShort(m) { return lang === 'en' ? EN_M[m - 1].slice(0, 3) : lang === 'ja' ? m + '月' : 'T' + m; }
  /** Short month + year: T10/2026 · Oct 2026 · 2026年10月 */
  function mYShort(m, y) { return lang === 'en' ? EN_M[m - 1].slice(0, 3) + ' ' + y : lang === 'ja' ? y + '年' + m + '月' : 'T' + m + '/' + y; }

  /* ---------- amount in words (deposit form) ---------- */
  function wordsVi(n) {
    var D = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
    function read3(x, full) {
      var h = Math.floor(x / 100), tt = Math.floor(x % 100 / 10), u = x % 10, w = [];
      if (full || h) w.push(D[h] + ' trăm');
      if (tt === 0) { if (u) w.push(((full || h) ? 'lẻ ' : '') + D[u]); }
      else if (tt === 1) w.push('mười' + (u === 5 ? ' lăm' : u ? ' ' + D[u] : ''));
      else w.push(D[tt] + ' mươi' + (u === 1 ? ' mốt' : u === 5 ? ' lăm' : u === 4 ? ' tư' : u ? ' ' + D[u] : ''));
      return w.join(' ');
    }
    var groups = []; while (n > 0) { groups.push(n % 1000); n = Math.floor(n / 1000); }
    var unit = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
    var out = []; for (var i = groups.length - 1; i >= 0; i--) { var g = groups[i]; if (!g) continue; out.push(read3(g, i < groups.length - 1) + (unit[i] ? ' ' + unit[i] : '')); }
    var s = out.join(' ').replace(/\s+/g, ' ').trim(); return s.charAt(0).toUpperCase() + s.slice(1) + ' đồng';
  }
  function wordsEn(n) {
    var ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    var TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    function read3(x) {
      var h = Math.floor(x / 100), r = x % 100, w = [];
      if (h) w.push(ONES[h] + ' hundred');
      if (r) w.push(r < 20 ? ONES[r] : TENS[Math.floor(r / 10)] + (r % 10 ? '-' + ONES[r % 10] : ''));
      return w.join(' ');
    }
    var groups = []; while (n > 0) { groups.push(n % 1000); n = Math.floor(n / 1000); }
    var unit = ['', 'thousand', 'million', 'billion', 'trillion', 'quadrillion'];
    var out = []; for (var i = groups.length - 1; i >= 0; i--) { if (groups[i]) out.push(read3(groups[i]) + (unit[i] ? ' ' + unit[i] : '')); }
    var s = out.join(' '); return s.charAt(0).toUpperCase() + s.slice(1) + ' dong';
  }
  function wordsJa(n) {
    var units = ['', '万', '億', '兆'], parts = [], i = 0;
    while (n > 0 && i < units.length) { var g = n % 10000; if (g) parts.unshift(int(g) + units[i]); n = Math.floor(n / 10000); i++; }
    if (n > 0) parts.unshift(int(n) + '京');
    return parts.join('') + 'ドン';
  }
  function words(n) {
    n = Math.floor(+n || 0);
    if (!n) return lang === 'en' ? 'Zero dong' : lang === 'ja' ? '0ドン' : 'Không đồng';
    return lang === 'en' ? wordsEn(n) : lang === 'ja' ? wordsJa(n) : wordsVi(n);
  }

  /* ---------- static markup ---------- */
  /** Elements marked data-i18n get their text translated (the original Vietnamese is the key);
      data-i18n-html keeps inner markup; data-i18n-attr="title,aria-label,placeholder" translates attributes. */
  function apply(root) {
    root = root || document;
    var els = root.querySelectorAll('[data-i18n],[data-i18n-html],[data-i18n-attr]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.hasAttribute('data-i18n')) { if (el._i18n == null) el._i18n = el.textContent.trim(); el.textContent = t(el._i18n); }
      if (el.hasAttribute('data-i18n-html')) { if (el._i18nH == null) el._i18nH = el.innerHTML.trim(); el.innerHTML = t(el._i18nH); }
      var attrs = el.getAttribute('data-i18n-attr');
      if (attrs) {
        el._i18nA = el._i18nA || {};
        attrs.split(',').forEach(function (a) { a = a.trim(); if (!a) return; if (el._i18nA[a] == null) el._i18nA[a] = el.getAttribute(a) || ''; el.setAttribute(a, t(el._i18nA[a])); });
      }
    }
    var titleKey = document.documentElement.getAttribute('data-title');
    if (titleKey) document.title = t(titleKey);
  }
  function markLang() { document.documentElement.setAttribute('lang', lang); }
  markLang();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { apply(); }); else apply();

  window.STCI18n = {
    LANGS: LANGS,
    get: function () { return lang; },
    set: function (v) {
      if (!LANGS[v] || v === lang) return;
      lang = v; nf = null;
      try { if (v === 'vi') localStorage.removeItem(KEY); else localStorage.setItem(KEY, v); } catch (e) { /* private mode */ }
      markLang(); apply();
      document.dispatchEvent(new CustomEvent('langchange', { detail: v }));
    },
    t: t, tMsg: tMsg, apply: apply,
    locale: locale, int: int, num: num, compact: compact, decIn: decIn, parseDecimal: parseDecimal,
    monthLabel: monthLabel, monthIn: monthIn, mShort: mShort, mYShort: mYShort, words: words,
  };
})();
