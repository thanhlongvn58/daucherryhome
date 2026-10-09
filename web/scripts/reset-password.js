// Usage: npm run reset-password -- <tên-đăng-nhập> <mật-khẩu-mới>
// For when the only owner forgets their password. Run on the server.
import { loadConfig } from '../src/config.js';
import { openStore } from '../src/store.js';
import { createAuth } from '../src/auth.js';

const [username, password] = process.argv.slice(2);
if (!username || !password) { console.error('Cách dùng: npm run reset-password -- <tên-đăng-nhập> <mật-khẩu-mới>'); process.exit(1); }
const cfg = loadConfig();
const store = openStore(cfg.dataDir);
const auth = createAuth(store, cfg);
const u = auth.listUsers().find(x => x.username === username.toLowerCase());
if (!u) { console.error('Không có tài khoản:', username); console.error('Các tài khoản hiện có:', auth.listUsers().map(x => x.username).join(', ') || '(chưa có)'); store.close(); process.exit(1); }
try {
  await auth.setPassword(u.id, password);
  console.log(`Đã đặt lại mật khẩu cho ${u.name} (@${u.username}). Mọi phiên đăng nhập cũ đã bị hủy.`);
} catch (e) { console.error(e.message); process.exitCode = 1; }
store.close();
