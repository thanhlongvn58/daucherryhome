import os from 'node:os';
import { loadConfig } from './config.js';
import { createApp } from './app.js';
import { startMdns } from './mdns.js';

const cfg = loadConfig();
const app = createApp(cfg);
const addr = await app.listen();

console.log(`Sổ Tài Chính Nhà Mình đang chạy (Node ${process.version}).`);
if (typeof addr === 'string') {
  // Hosting platforms such as LiteSpeed hand over a socket path instead of a port.
  console.log(`  Đang nghe qua socket của máy chủ web: ${addr}`);
} else {
  const portSuffix = addr.port === 80 ? '' : `:${addr.port}`;
  const lanIps = Object.values(os.networkInterfaces()).flat().filter(a => a && a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.')).map(a => a.address);
  console.log(`  Trên máy này:      http://localhost${portSuffix}`);
  if (cfg.mdnsName) {
    const mdns = startMdns(cfg.mdnsName);
    process.once('beforeExit', () => mdns.close());
    console.log(`  Trên điện thoại:   http://${mdns.name}${portSuffix}   (cùng mạng Wi-Fi nhà)`);
  }
  for (const ip of lanIps) console.log(`  Hoặc bằng IP:      http://${ip}${portSuffix}`);
}
if (cfg.publicUrl) console.log(`  Địa chỉ công khai: ${cfg.publicUrl}`);
console.log(`Dữ liệu: ${app.store.file}`);
if (app.auth.needsSetup()) console.log('Chưa có tài khoản nào. Mở trang web để tạo tài khoản quản lý sổ.');

let stopping = false;
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => {
    if (stopping) return;
    stopping = true;
    console.log('Đang dừng máy chủ…');
    await app.close();
    process.exit(0);
  });
}
