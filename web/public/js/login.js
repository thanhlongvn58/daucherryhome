(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const params = new URLSearchParams(location.search);
  let setup = false;

  function safeNext() {
    const n = params.get('next') || '/';
    return n.startsWith('/') && !n.startsWith('//') ? n : '/';
  }
  function setMode(isSetup) {
    setup = isSetup;
    $('#nameField').hidden = !isSetup;
    $('#pwHint').hidden = !isSetup;
    $('#password').autocomplete = isSetup ? 'new-password' : 'current-password';
    $('#authTitle').textContent = isSetup ? 'Tạo tài khoản quản lý sổ' : 'Chào nhà mình!';
    $('#authLead').textContent = isSetup ? 'Lần đầu sử dụng. Tài khoản này quản lý thành viên và dữ liệu của cả nhà.' : 'Đăng nhập để cùng chăm lo tài chính gia đình.';
    $('#submitBtn').textContent = isSetup ? 'Tạo tài khoản và bắt đầu' : 'Đăng nhập';
    $('#authFoot').textContent = isSetup ? 'Sau khi vào, thêm người nhà trong mục Thiết lập › Thành viên gia đình.' : 'Quên mật khẩu? Nhờ người quản lý sổ đặt lại giúp bạn.';
    document.title = (isSetup ? 'Thiết lập' : 'Đăng nhập') + ' · Sổ Tài Chính Nhà Mình';
    (isSetup ? $('#name') : $('#username')).focus();
  }
  function fieldError(id, msg) {
    const input = $('#' + id); const out = $('#' + id + 'Err');
    out.textContent = msg || '';
    if (msg) { input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', id + 'Err'); }
    else { input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby'); }
    return !msg;
  }
  function formError(msg) { const e = $('#formError'); e.textContent = msg || ''; e.hidden = !msg; }

  $('#pwToggle').addEventListener('click', e => {
    const p = $('#password'); const show = p.type === 'password';
    p.type = show ? 'text' : 'password';
    e.currentTarget.textContent = show ? 'Ẩn' : 'Hiện';
    e.currentTarget.setAttribute('aria-pressed', String(show));
    p.focus();
  });
  for (const id of ['name', 'username', 'password']) $('#' + id).addEventListener('input', () => fieldError(id, ''));

  $('#authForm').addEventListener('submit', async e => {
    e.preventDefault();
    formError('');
    const name = $('#name').value.trim(), username = $('#username').value.trim(), password = $('#password').value;
    let ok = true;
    if (setup) ok = fieldError('name', name ? '' : 'Nhập tên hiển thị.') && ok;
    ok = fieldError('username', !username ? 'Nhập tên đăng nhập.' : setup && !/^[a-zA-Z0-9._-]{3,32}$/.test(username) ? 'Dùng 3–32 ký tự: chữ không dấu, số, dấu chấm hoặc gạch ngang.' : '') && ok;
    ok = fieldError('password', !password ? 'Nhập mật khẩu.' : setup && password.length < 8 ? 'Mật khẩu cần ít nhất 8 ký tự.' : '') && ok;
    if (!ok) { document.querySelector('[aria-invalid="true"]')?.focus(); return; }

    const btn = $('#submitBtn'); const label = btn.textContent;
    btn.disabled = true; btn.textContent = setup ? 'Đang tạo…' : 'Đang đăng nhập…';
    try {
      const r = await fetch(setup ? '/api/setup' : '/api/login', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(setup ? { name, username, password } : { username, password }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 409 && setup) { setMode(false); formError(data.message); }
        else formError(data.message || 'Không đăng nhập được. Thử lại.');
        return;
      }
      location.replace(safeNext());
    } catch {
      formError('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.');
    } finally {
      btn.disabled = false; btn.textContent = label;
    }
  });

  const tb = document.getElementById('themeBtn');
  if (tb && window.STCTheme) {
    const icons = { auto: '<path d="M12 3a9 9 0 1 0 0 18z" fill="currentColor"/><circle cx="12" cy="12" r="9"/>', light: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>', dark: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>' };
    const labels = { auto: 'Theo thiết bị', light: 'Sáng', dark: 'Tối' };
    const paint = () => { const m = STCTheme.get(); tb.querySelector('svg').innerHTML = icons[m]; tb.title = 'Giao diện: ' + labels[m] + ' (bấm để đổi)'; };
    tb.addEventListener('click', () => { const order = ['auto', 'light', 'dark']; STCTheme.set(order[(order.indexOf(STCTheme.get()) + 1) % 3]); paint(); });
    paint();
  }
  fetch('/api/session', { credentials: 'same-origin' }).then(r => r.json()).then(r => {
    if (r.user) return location.replace(safeNext());
    setMode(!!r.needsSetup);
  }).catch(() => { setMode(params.has('setup')); formError('Không kết nối được máy chủ.'); });
})();
