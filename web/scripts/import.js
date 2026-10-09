// Usage: npm run import -- <backup.json> [--force]
// Loads a backup (the app's "Sao lưu (.json)" format) into the database.
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../src/config.js';
import { openStore, backupToDocs } from '../src/store.js';

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
const force = args.includes('--force');
if (!file) { console.error('Cách dùng: npm run import -- <tệp-sao-lưu.json> [--force]'); process.exit(1); }

const cfg = loadConfig();
const backup = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
const docs = backupToDocs(backup);
const store = openStore(cfg.dataDir);
const existing = store.count();
if (existing > 0 && !force) {
  console.error(`Cơ sở dữ liệu đang có ${existing} bản ghi. Thêm --force để thay thế toàn bộ (một bản sao lưu sẽ được tạo trước).`);
  store.close(); process.exit(1);
}
if (existing > 0) console.log('Đã sao lưu dữ liệu cũ:', store.backupTo(path.join(cfg.dataDir, 'backups', `truoc-khi-nhap-${Date.now()}.db`)));
const n = store.importAll(backup);
store.close();
console.log(`Đã nhập ${n} bản ghi (${docs.filter(d => d.collection === 'tx').length} thu chi, ${docs.filter(d => d.collection === 'fund').length} biến động quỹ) vào ${cfg.dataDir}.`);
console.log('Nếu máy chủ đang chạy, tải lại trang để thấy dữ liệu mới.');
