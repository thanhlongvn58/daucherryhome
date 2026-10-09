// Entry point that works everywhere, including hosts (Hostinger / LiteSpeed) that load the
// startup file with require() and pass a socket path in PORT.
//  - CommonJS on purpose: it can always be require()'d, and loads the ES-module app with import().
//  - Node 22.5–22.12 only expose node:sqlite behind --experimental-sqlite: relaunch with the flag.
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

function logStartupError(err) {
  const msg = `[${new Date().toISOString()}] Node ${process.version}: ${err && err.stack || err}\n`;
  console.error('Không khởi động được Sổ Tài Chính:', err);
  try {
    const raw = (process.env.DATA_DIR || 'data').trim();
    const dir = raw.startsWith('~') ? path.join(os.homedir(), raw.slice(1)) : path.resolve(__dirname, raw);
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(path.join(dir, 'startup-error.log'), msg);
  } catch { /* best effort */ }
}

function sqliteAvailable() {
  try { require('node:sqlite'); return true; } catch { return false; }
}

const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 5)) {
  logStartupError(new Error(`Cần Node.js 22.5 trở lên (khuyên dùng 24). Phiên bản hiện tại: ${process.version}.`));
  process.exitCode = 1;
} else if (!sqliteAvailable() && !process.env.STC_SQLITE_FLAG) {
  const child = spawn(process.execPath, ['--experimental-sqlite', '--no-warnings', __filename], {
    stdio: 'inherit', env: { ...process.env, STC_SQLITE_FLAG: '1' },
  });
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => child.kill(sig));
  child.on('exit', code => process.exit(code ?? 1));
} else {
  import('./src/main.js').catch(err => { logStartupError(err); process.exit(1); });
}
