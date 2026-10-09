// Usage: npm run backup [-- <đường-dẫn.db>]
// Writes a consistent snapshot of the database (safe while the server is running).
import path from 'node:path';
import { loadConfig } from '../src/config.js';
import { openStore } from '../src/store.js';

const cfg = loadConfig();
const dest = path.resolve(process.argv[2] || path.join(cfg.dataDir, 'backups', `thu-cong-${new Date().toISOString().replace(/[:.]/g, '-')}.db`));
const store = openStore(cfg.dataDir);
store.backupTo(dest);
store.close();
console.log('Đã sao lưu:', dest);
