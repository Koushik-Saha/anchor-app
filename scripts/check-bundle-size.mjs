// Enforces CLAUDE.md rule 6: app JS must stay under 200 KB gzipped.
// Run after `npm run build`. Counts every .js file in dist/assets (the app bundle);
// the service worker and Workbox runtime are reported separately.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const LIMIT_BYTES = 200 * 1024;
const DIST = 'dist';

if (!existsSync(DIST)) {
  console.error('dist/ not found — run `npm run build` first.');
  process.exit(1);
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const gz = (file) => gzipSync(readFileSync(file), { level: 9 }).length;
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

const jsFiles = walk(DIST).filter((f) => f.endsWith('.js'));
const appFiles = jsFiles.filter((f) => relative(DIST, f).startsWith('assets'));
const swFiles = jsFiles.filter((f) => !appFiles.includes(f));

let total = 0;
for (const file of appFiles) {
  const size = gz(file);
  total += size;
  console.log(`  ${relative(DIST, file).padEnd(48)} ${kb(size)}`);
}
for (const file of swFiles) {
  console.log(`  ${relative(DIST, file).padEnd(48)} ${kb(gz(file))}  (service worker, not counted)`);
}

console.log(`\nApp JS total (gzip): ${kb(total)} / ${kb(LIMIT_BYTES)} budget`);
if (total > LIMIT_BYTES) {
  console.error('Bundle budget exceeded (CLAUDE.md rule 6).');
  process.exit(1);
}
