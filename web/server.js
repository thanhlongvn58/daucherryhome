import os from 'node:os';
import { loadConfig } from './src/config.js';
import { createApp } from './src/app.js';
import { startMdns } from './src/mdns.js';

const cfg = loadConfig();
const app = createApp(cfg);
const addr = await app.listen();

const portSuffix = addr.port === 80 ? '' : `:${addr.port}`;
const lanIps = Object.values(os.networkInterfaces()).flat().filter(a => a && a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.')).map(a => a.address);
console.log(`Sổ Tài Chính Nhà Mình đang chạy.`);
console.log(`  Trên máy này:      http://localhost${portSuffix}`);
let mdns = null;
if (cfg.mdnsName) {
  mdns = startMdns(cfg.mdnsName);
  console.log(`  Trên điện thoại:   http://${mdns.name}${portSuffix}   (cùng mạng Wi-Fi nhà)`);
}
for (const ip of lanIps) console.log(`  Hoặc bằng IP:      http://${ip}${portSuffix}`);
if (cfg.publicUrl) console.log(`  Địa chỉ công khai: ${cfg.publicUrl}`);
console.log(`Dữ liệu: ${app.store.file}`);
if (app.auth.needsSetup()) console.log('Chưa có tài khoản nào. Mở trang web để tạo tài khoản quản lý sổ.');

let stopping = false;
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => {
    if (stopping) return;
    stopping = true;
    console.log('Đang dừng máy chủ…');
    mdns?.close();
    await app.close();
    process.exit(0);
  });
}
