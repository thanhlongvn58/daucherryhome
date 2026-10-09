// Kept for existing shortcuts and scripts (`node server.js`); the real entry is start.cjs.
import { createRequire } from 'node:module';
createRequire(import.meta.url)('./start.cjs');
