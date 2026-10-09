/* Light / dark / follow-device theme. Loaded synchronously in <head> so the saved choice applies
   before the first paint (no white flash). The choice is remembered per device. */
(function () {
  'use strict';
  var KEY = 'stc.theme';
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function get() { try { var v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : 'auto'; } catch (e) { return 'auto'; } }
  function isDark(mode) { return mode === 'dark' || (mode === 'auto' && !!(mq && mq.matches)); }
  function apply(mode) {
    var root = document.documentElement;
    if (mode === 'light' || mode === 'dark') root.setAttribute('data-theme', mode); else root.removeAttribute('data-theme');
    var dark = isDark(mode);
    root.style.colorScheme = dark ? 'dark' : 'light';
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#0C2E20' : '#1B5C41');
  }
  apply(get());
  window.STCTheme = {
    get: get,
    isDark: function () { return isDark(get()); },
    set: function (mode) {
      try { if (mode === 'auto') localStorage.removeItem(KEY); else localStorage.setItem(KEY, mode); } catch (e) { /* private mode */ }
      apply(mode);
      document.dispatchEvent(new CustomEvent('themechange', { detail: mode }));
    },
  };
  if (mq) {
    var onChange = function () { if (get() === 'auto') { apply('auto'); document.dispatchEvent(new CustomEvent('themechange', { detail: 'auto' })); } };
    if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
  }
})();
