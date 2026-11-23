import type { CrisisChoice, CrisisRegion } from '../platform/storage';
import { en, type Strings } from './strings';

/**
 * Crisis lines, bundled with the app (no lookup, works offline). Numbers and service
 * names here are safety-critical: re-check them against each service before changing.
 */

export interface CrisisSegment {
  text: string;
  /** tel: or sms: link. Plain text when omitted. */
  href?: string;
  /** Spoken name of the link. */
  ariaLabel?: string;
}

export interface CrisisLineInfo {
  region: CrisisRegion;
  /** The line, in reading order. Links are part of it. */
  segments: readonly CrisisSegment[];
  /** One short extra line (only for "anywhere else"). */
  extra?: string;
}

function callOrText988(c: Strings['crisis'], service: string): readonly CrisisSegment[] {
  return [
    { text: c.call, href: 'tel:988', ariaLabel: c.callAria(service) },
    { text: c.or },
    { text: c.text, href: 'sms:988', ariaLabel: c.textAria(service) },
    { text: `${c.number988} (${service})` },
  ];
}

const callOnly = (text: string, digits: string): readonly CrisisSegment[] => [
  { text, href: `tel:${digits}`, ariaLabel: text },
];

function buildLines(s: Strings): Readonly<Record<CrisisRegion, CrisisLineInfo>> {
  const c = s.crisis;
  const usSegments = callOrText988(c, c.usService);
  return {
    us: { region: 'us', segments: usSegments },
    ca: { region: 'ca', segments: callOrText988(c, c.caService) },
    'uk-ie': { region: 'uk-ie', segments: callOnly(c.samaritans, '116123') },
    au: { region: 'au', segments: callOnly(c.lifeline, '131114') },
    other: { region: 'other', segments: usSegments, extra: c.elsewhere },
  };
}

export const CRISIS_LINES = buildLines(en);

/** The choices in Settings, in display order (labels are in the strings table). */
export const CRISIS_CHOICES: readonly { value: CrisisChoice }[] = [
  { value: 'auto' },
  { value: 'us' },
  { value: 'ca' },
  { value: 'uk-ie' },
  { value: 'au' },
  { value: 'other' },
];

const REGION_BY_COUNTRY: Readonly<Record<string, CrisisRegion>> = {
  US: 'us',
  CA: 'ca',
  GB: 'uk-ie',
  UK: 'uk-ie',
  IE: 'uk-ie',
  AU: 'au',
};

function countryOf(locale: string): string | undefined {
  try {
    return new Intl.Locale(locale.replace(/_/g, '-')).region?.toUpperCase();
  } catch {
    return undefined;
  }
}

/**
 * The region for the device's locales, most preferred first. Uses the first locale that
 * names a country at all, so fr-FR + en-US is France ("anywhere else"), not the US.
 */
export function regionFromLocales(locales: readonly string[]): CrisisRegion {
  for (const locale of locales) {
    const country = countryOf(locale);
    if (country) return REGION_BY_COUNTRY[country] ?? 'other';
  }
  return 'other';
}

/** A manual choice in Settings always wins over the device locale. */
export function resolveCrisisLine(choice: CrisisChoice, locales: readonly string[], s: Strings = en): CrisisLineInfo {
  return buildLines(s)[choice === 'auto' ? regionFromLocales(locales) : choice];
}

/** The line as plain text (no links). */
export function crisisLineText(line: CrisisLineInfo): string {
  return line.segments.map((s) => s.text).join('');
}
