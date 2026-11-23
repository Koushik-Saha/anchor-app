import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, normalizeSettings } from '../platform/storage';
import { CRISIS_CHOICES, CRISIS_LINES, crisisLineText, regionFromLocales, resolveCrisisLine } from './crisisLines';

const hrefs = (region: keyof typeof CRISIS_LINES) => CRISIS_LINES[region].segments.flatMap((s) => (s.href ? [s.href] : []));

describe('the lines, exactly as specified', () => {
  it.each([
    ['us', 'Call or text 988 (Suicide and Crisis Lifeline)'],
    ['ca', 'Call or text 988 (Suicide Prevention Service)'],
    ['uk-ie', 'Call Samaritans free, 116 123'],
    ['au', 'Call Lifeline, 13 11 14'],
  ] as const)('%s', (region, text) => {
    expect(crisisLineText(CRISIS_LINES[region])).toBe(text);
    expect(CRISIS_LINES[region].extra).toBeUndefined();
  });

  it('anywhere else: the US line plus one short line', () => {
    expect(crisisLineText(CRISIS_LINES.other)).toBe(crisisLineText(CRISIS_LINES.us));
    expect(CRISIS_LINES.other.extra).toBe('or your local emergency number');
  });

  it('988 lines call or text; Samaritans and Lifeline are call-only', () => {
    expect(hrefs('us')).toEqual(['tel:988', 'sms:988']);
    expect(hrefs('ca')).toEqual(['tel:988', 'sms:988']);
    expect(hrefs('other')).toEqual(['tel:988', 'sms:988']);
    expect(hrefs('uk-ie')).toEqual(['tel:116123']);
    expect(hrefs('au')).toEqual(['tel:131114']);
  });

  it('every link has a spoken name', () => {
    for (const line of Object.values(CRISIS_LINES)) {
      for (const s of line.segments) if (s.href) expect(s.ariaLabel).toBeTruthy();
    }
  });
});

describe('locale to line', () => {
  it.each([
    ['en-US', 'us'],
    ['es-US', 'us'],
    ['en-CA', 'ca'],
    ['fr-CA', 'ca'],
    ['en-GB', 'uk-ie'],
    ['cy-GB', 'uk-ie'],
    ['en-IE', 'uk-ie'],
    ['ga-IE', 'uk-ie'],
    ['en-AU', 'au'],
    ['en_AU', 'au'],
  ] as const)('%s → %s', (locale, region) => {
    expect(regionFromLocales([locale])).toBe(region);
  });

  it.each([['fr-FR'], ['es-MX'], ['en-NZ'], ['de'], ['en'], ['not a locale']])('%s falls back', (locale) => {
    expect(regionFromLocales([locale])).toBe('other');
  });

  it('no locale falls back', () => {
    expect(regionFromLocales([])).toBe('other');
  });

  it('uses the first locale naming a country', () => {
    expect(regionFromLocales(['en', 'en-GB', 'en-US'])).toBe('uk-ie');
    expect(regionFromLocales(['fr-FR', 'en-US'])).toBe('other');
  });
});

describe('manual override', () => {
  it('Automatic follows the locale', () => {
    expect(resolveCrisisLine('auto', ['en-AU']).region).toBe('au');
  });

  it.each(CRISIS_CHOICES.filter((c) => c.value !== 'auto').map((c) => c.value))('%s wins over the locale', (choice) => {
    for (const locale of ['en-US', 'en-GB', 'en-AU', 'fr-FR']) expect(resolveCrisisLine(choice, [locale]).region).toBe(choice);
  });

  it('defaults to Automatic and survives storage; junk falls back', () => {
    expect(DEFAULT_SETTINGS.crisisRegion).toBe('auto');
    expect(normalizeSettings({ crisisRegion: 'uk-ie' }).crisisRegion).toBe('uk-ie');
    expect(normalizeSettings({ crisisRegion: 'mars' }).crisisRegion).toBe('auto');
    expect(normalizeSettings({}).crisisRegion).toBe('auto');
  });
});
