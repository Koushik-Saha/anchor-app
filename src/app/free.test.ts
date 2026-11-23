import { describe, expect, it } from 'vitest';
import { getProtocol, isProtocolId, protocols } from '../content/protocols';
import { planOnDone } from './plan';

/**
 * Anchor is free (CLAUDE.md "Launch decision"): every feature is reachable with no
 * purchase state, and nothing a person sees can mention unlocking, buying or upgrading.
 */

const raw = (files: Record<string, unknown>): [string, string][] =>
  Object.entries(files)
    .filter(([path]) => !/\.test\.tsx?$/.test(path))
    .map(([path, text]) => [path, String(text)]);

/** Everything that renders or feeds what renders. (platform/storage.ts names the retired on-device key, by design.) */
const UI_FILES = raw(
  import.meta.glob(['../screens/**/*.{ts,tsx}', '../components/**/*.{ts,tsx}', '../app/**/*.{ts,tsx}', '../content/**/*.ts', '../engine/**/*.ts', '../App.tsx', '../main.tsx'], {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
);
const ALL_SOURCE = raw(import.meta.glob('../**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }));
const PACKAGE_JSON = String(
  Object.values(import.meta.glob('../../package.json', { query: '?raw', import: 'default', eager: true }))[0],
);
const source = (suffix: string) => UI_FILES.find(([path]) => path.endsWith(suffix))?.[1] ?? '';

const PAYWALL_WORDS =
  /unlock|purchas|paywall|premium|upgrade|\bpro version\b|\bbuy\b|full_unlock|\bentitle|restore purchases|\$\s?\d|one-time/i;

describe('Anchor is free', () => {
  it('found the UI source files to check', () => {
    expect(UI_FILES.length).toBeGreaterThan(20);
    expect(source('Library.tsx')).toContain('export function Library');
    expect(ALL_SOURCE.length).toBeGreaterThan(UI_FILES.length);
    expect(PACKAGE_JSON).toContain('"dependencies"');
  });

  it.each(UI_FILES)('no unlock / purchase / upgrade wording or code in %s', (_path, text) => {
      const hits = text
        .split('\n')
        .map((line, i) => `${i + 1}: ${line.trim()}`)
        .filter((line) => PAYWALL_WORDS.test(line));
      expect(hits).toEqual([]);
  });

  it('no module imports a purchase adapter or store-billing plugin', () => {
    for (const [file, text] of ALL_SOURCE) {
      expect(text, file).not.toMatch(/from ['"][^'"]*(purchases|unlock|native-purchases|revenuecat|billing)['"]/i);
    }
  });

  it('ships no store-billing dependency', () => {
    const pkg = JSON.parse(PACKAGE_JSON) as Record<string, Record<string, string> | undefined>;
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    expect(deps.filter((d) => /purchase|billing|revenuecat|iap|storekit/i.test(d))).toEqual([]);
  });

  it('every protocol, including the formerly paid ones, is in the Library and starts by id', () => {
    const ids = protocols.map((p) => p.id);
    for (const id of ['box-breathing', 'extended-3min', 'night-protocol', 'classic-90', 'breathing-60', 'grounding-only']) {
      expect(ids).toContain(id);
      expect(isProtocolId(id)).toBe(true);
      expect(getProtocol(id)?.phases.length).toBeGreaterThan(0);
    }
  });

  it('the Library lists every protocol with no filter or gate', () => {
    const library = source('screens/Library.tsx');
    expect(library).toMatch(/protocols\.map\(/);
    expect(library).not.toMatch(/protocols\.filter\(/);
  });

  it('My plan on Done needs only the saved plan: no purchase state', () => {
    expect(planOnDone({ note: 'This passes.', contactName: 'Sam', contactPhone: '555 0100' })).toEqual({
      note: 'This passes.',
      tel: 'tel:5550100',
    });
    expect(planOnDone(undefined)).toEqual({ note: undefined, tel: null });
    expect(planOnDone({ note: '   ' })).toEqual({ note: undefined, tel: null });
  });

  it('the My plan screen always renders the form', () => {
    const plan = source('screens/Plan.tsx');
    expect(plan).toMatch(/<PlanForm \/>/);
    expect(plan).not.toMatch(/\?\s*<PlanForm/); // no conditional around it
  });
});
