// Scans every piece of user-facing and store-facing copy for medical / treatment
// language that could trigger App Store guideline 1.4.1 or Google Play health-policy
// review. Run before each release: `npm run copy-scan`.
//
//   HIGH   — treatment, cure, diagnosis or efficacy claims. Exit code 1 unless the line
//            carries the marker `copy-scan-ok` (a reviewed, intentional use).
//   REVIEW — medical vocabulary that is fine in a disclaimer but deserves a human look.
//
// Code comments are skipped; only strings/markup that users or reviewers can see matter.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url)); // decodes spaces etc. in the path

const HIGH = [
  /\btreat(s|ed|ing|ment|ments)?\b/i,
  /\bcur(e|es|ed|ing)\b/i,
  /\bheal(s|ed|ing)?\b/i,
  /\btherap(y|ies|eutic|ist)\b/i,
  /\bdiagnos(e|es|ed|is|tic)\b/i,
  /\bclinical(ly)?\b/i,
  /\bprescri(be|bed|ption)s?\b/i,
  /\brelie(f|ve|ves|ved)\b/i,
  /\bprevent(s|ion|ing)?\b/i,
  /\b(stops?|ends?|eliminates?|reduces?|lowers?|fix(es)?)\s+(your\s+)?(panic|anxiety|stress|attacks?|symptoms?)\b/i,
  /\b(proven|evidence[- ]based|scientifically|guaranteed?|doctor[- ]approved|fda)\b/i,
];
const REVIEW = [
  /\bmedic(al|ine|ines|ation|ations)\b/i,
  /\bsymptoms?\b/i,
  /\b(disorder|patients?|illness|disease|psychiatr\w*)\b/i,
  /\bmental health\b/i,
  /\bhealth ?care\b/i,
];

const SOURCES = [
  ...walk('src').filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f)),
  ...walk('public').filter((f) => f.endsWith('.html')),
  'index.html',
  'vite.config.ts',
  'android/app/src/main/res/values/strings.xml',
  'android/app/src/main/res/xml/shortcuts.xml',
  'ios/App/App/Info.plist',
  'docs/store-listing.md',
].filter((f) => existsSync(join(ROOT, f)));

function walk(dir) {
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs).flatMap((name) => {
    const rel = join(dir, name);
    return statSync(join(ROOT, rel)).isDirectory() ? walk(rel) : [rel];
  });
}

const isComment = (line, file) => {
  const t = line.trim();
  if (file.endsWith('.md')) return false;
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('<!--') || t.startsWith('{/*');
};

if (SOURCES.length < 10) {
  console.error(`Only ${SOURCES.length} files found to scan — refusing to report "clean". Check the paths.`);
  process.exit(2);
}

/** A claim word right after "no / not / never / without" is a disclaimer, not a claim. */
const NEGATION = /\b(no|not|never|without|nor)\b[^.;:]{0,60}$/i;
const classify = (line) => {
  let negated = false;
  for (const r of HIGH) {
    const m = r.exec(line);
    if (!m) continue;
    if (NEGATION.test(line.slice(0, m.index))) negated = true;
    else return 'HIGH';
  }
  return negated || REVIEW.some((r) => r.test(line)) ? 'REVIEW' : null;
};

let highCount = 0;
const hits = [];
for (const file of SOURCES) {
  const lines = readFileSync(join(ROOT, file), 'utf8').split('\n');
  let inFence = false;
  lines.forEach((line, i) => {
    // Markdown docs: only the paste-ready copy inside ``` fences ships to a store.
    if (file.endsWith('.md')) {
      if (line.trim().startsWith('```')) inFence = !inFence;
      if (!inFence || line.trim().startsWith('```')) return;
    }
    if (isComment(line, file)) return;
    const level = classify(line);
    if (!level) return;
    const ok = line.includes('copy-scan-ok');
    if (level === 'HIGH' && !ok) highCount++;
    hits.push(`${level === 'HIGH' ? (ok ? 'ok  ' : 'HIGH') : 'REVW'}  ${relative(ROOT, join(ROOT, file))}:${i + 1}  ${line.trim().slice(0, 140)}`);
  });
}

console.log(`Scanned ${SOURCES.length} files of user/store-facing copy.`);
console.log(hits.length ? hits.join('\n') : 'No medical or treatment language found.');
if (highCount) {
  console.error(`\n${highCount} HIGH-risk line(s): rewrite, or mark with "copy-scan-ok" after review.`);
  process.exit(1);
}
