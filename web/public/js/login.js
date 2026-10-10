(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const I = window.STCI18n;
  const L = (s, v) => (I ? I.t(s, v) : s);
  const params = new URLSearchParams(location.search);
  let setup = false;
  let lastError = '';
  const REMEMBER = 'stc.rememberUser';
  const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* private mode */ } } };

  function safeNext() {
    const n = params.get('next') || '/';
    return n.startsWith('/') && !n.startsWith('//') ? n : '/';
  }
  /** Texts that depend on the mode (sign in / first setup); redrawn when the language changes. */
  function paintMode() {
    $('#authTitle').textContent = setup ? L('Tạo tài khoản quản lý sổ') : L('Chào nhà mình!');
    $('#authLead').textContent = setup ? L('Lần đầu sử dụng. Tài khoản này quản lý thành viên và dữ liệu của cả nhà.') : L('Đăng nhập để cùng chăm lo tài chính gia đình.');
    if (!$('#submitBtn').disabled) $('#submitBtn').textContent = setup ? L('Tạo tài khoản và bắt đầu') : L('Đăng nhập');
    $('#authFoot').textContent = setup ? L('Sau khi vào, thêm người nhà trong mục Thiết lập › Thành viên gia đình.') : L('Quên mật khẩu? Nhờ người quản lý sổ đặt lại giúp bạn.');
    document.title = (setup ? L('Thiết lập lần đầu') : L('Đăng nhập')) + ' · ' + L('Sổ Tài Chính Nhà Mình');
    paintPw();
    if (lastError) formError(lastError);
    const info = $('#formInfo');
    if (params.has('timeout') && !setup) { info.textContent = L('Bạn đã được đăng xuất tự động sau 20 phút không thao tác để bảo vệ thông tin.'); info.hidden = false; } else info.hidden = true;
  }
  function setMode(isSetup) {
    setup = isSetup;
    $('#nameField').hidden = !isSetup;
    $('#pwHint').hidden = !isSetup;
    $('#password').autocomplete = isSetup ? 'new-password' : 'current-password';
    $('#rememberRow').hidden = isSetup;
    const saved = !isSetup && store.get(REMEMBER);
    if (saved && !$('#username').value) { $('#username').value = saved; $('#remember').checked = true; }
    paintMode();
    (isSetup ? $('#name') : saved ? $('#password') : $('#username')).focus();
  }
  function fieldError(id, msg) {
    const input = $('#' + id); const out = $('#' + id + 'Err');
    out.textContent = msg || '';
    if (msg) { input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', id + 'Err'); }
    else { input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby'); }
    return !msg;
  }
  /** Messages are kept in Vietnamese (as the server sends them) and shown in the current language. */
  function formError(msg) { lastError = msg || ''; const e = $('#formError'); e.textContent = msg ? (I ? I.tMsg(msg) : msg) : ''; e.hidden = !msg; }

  /** Eye icon: open eye = tap to show the password, crossed eye = tap to hide it again. */
  const EYE = '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>';
  const EYE_OFF = '<path d="M3 3l18 18"/><path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.9 8.3 2 12 2 12s3.6 7 10 7a10.7 10.7 0 0 0 5.4-1.4"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>';
  function paintPw() {
    const b = $('#pwToggle'), shown = $('#password').type === 'text';
    b.querySelector('svg').innerHTML = shown ? EYE_OFF : EYE;
    const label = shown ? L('Ẩn mật khẩu') : L('Hiện mật khẩu');
    b.setAttribute('aria-label', label); b.title = label; b.setAttribute('aria-pressed', String(shown));
  }
  $('#pwToggle').addEventListener('click', () => {
    const p = $('#password'); p.type = p.type === 'password' ? 'text' : 'password';
    paintPw(); p.focus();
  });
  for (const id of ['name', 'username', 'password']) $('#' + id).addEventListener('input', () => fieldError(id, ''));

  $('#authForm').addEventListener('submit', async e => {
    e.preventDefault();
    formError('');
    const name = $('#name').value.trim(), username = $('#username').value.trim(), password = $('#password').value;
    let ok = true;
    if (setup) ok = fieldError('name', name ? '' : L('Nhập tên hiển thị.')) && ok;
    ok = fieldError('username', !username ? L('Nhập tên đăng nhập.') : setup && !/^[a-zA-Z0-9._-]{3,32}$/.test(username) ? L('Dùng 3–32 ký tự: chữ không dấu, số, dấu chấm hoặc gạch ngang.') : '') && ok;
    ok = fieldError('password', !password ? L('Nhập mật khẩu.') : setup && password.length < 8 ? L('Mật khẩu cần ít nhất 8 ký tự.') : '') && ok;
    if (!ok) { document.querySelector('[aria-invalid="true"]')?.focus(); return; }

    const btn = $('#submitBtn');
    btn.disabled = true; btn.textContent = setup ? L('Đang tạo…') : L('Đang đăng nhập…');
    try {
      const r = await fetch(setup ? '/api/setup' : '/api/login', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(setup ? { name, username, password } : { username, password, remember: $('#remember').checked }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 409 && setup) { setMode(false); formError(data.message); }
        else formError(data.message || 'Không đăng nhập được. Thử lại.');
        return;
      }
      if (!setup) {
        // "Remember me": keep the username here; the password itself is left to the device's password manager.
        if ($('#remember').checked) {
          store.set(REMEMBER, username);
          if (window.PasswordCredential && navigator.credentials) { try { await navigator.credentials.store(new PasswordCredential({ id: username, password, name: username })); } catch { /* declined */ } }
        } else store.set(REMEMBER, null);
      }
      location.replace(safeNext());
    } catch {
      formError('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.');
    } finally {
      btn.disabled = false; btn.textContent = setup ? L('Tạo tài khoản và bắt đầu') : L('Đăng nhập');
    }
  });

  /* light / dark */
  const tb = document.getElementById('themeBtn');
  const icons = { auto: '<path d="M12 3a9 9 0 1 0 0 18z" fill="currentColor"/><circle cx="12" cy="12" r="9"/>', light: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>', dark: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>' };
  const labels = { auto: 'Theo thiết bị', light: 'Sáng', dark: 'Tối' };
  const paintTheme = () => { if (!tb || !window.STCTheme) return; const m = STCTheme.get(); tb.querySelector('svg').innerHTML = icons[m]; tb.title = L('Giao diện: {mode} (bấm để đổi)', { mode: L(labels[m]) }); tb.setAttribute('aria-label', tb.title); };
  if (tb && window.STCTheme) {
    tb.addEventListener('click', () => { const order = ['auto', 'light', 'dark']; STCTheme.set(order[(order.indexOf(STCTheme.get()) + 1) % 3]); paintTheme(); });
    paintTheme();
  }

  /* language */
  const ls = $('#langSel');
  const paintLang = () => { if (!I || !ls) return; ls.value = I.get(); $('#langCode').textContent = I.LANGS[I.get()].short; };
  if (I && ls) {
    ls.addEventListener('change', () => I.set(ls.value));
    document.addEventListener('langchange', () => { paintLang(); paintMode(); paintTheme(); });
    paintLang();
  }

  paintMode();
  fetch('/api/session', { credentials: 'same-origin' }).then(r => r.json()).then(r => {
    if (r.user) return location.replace(safeNext());
    setMode(!!r.needsSetup);
  }).catch(() => { setMode(params.has('setup')); formError('Không kết nối được máy chủ.'); });
})();
