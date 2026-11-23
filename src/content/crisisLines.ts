import type { CrisisChoice, CrisisRegion } from '../platform/storage';

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

const callOrText988 = (service: string): readonly CrisisSegment[] => [
  { text: 'Call', href: 'tel:988', ariaLabel: `Call 988, ${service}` },
  { text: ' or ' },
  { text: 'text', href: 'sms:988', ariaLabel: `Text 988, ${service}` },
  { text: ` 988 (${service})` },
];

const callOnly = (text: string, digits: string): readonly CrisisSegment[] => [
  { text, href: `tel:${digits}`, ariaLabel: text },
];

const US_SEGMENTS = callOrText988('Suicide and Crisis Lifeline');

export const CRISIS_LINES: Readonly<Record<CrisisRegion, CrisisLineInfo>> = {
  us: { region: 'us', segments: US_SEGMENTS },
  ca: { region: 'ca', segments: callOrText988('Suicide Prevention Service') }, // copy-scan-ok: a service name
  'uk-ie': { region: 'uk-ie', segments: callOnly('Call Samaritans free, 116 123', '116123') },
  au: { region: 'au', segments: callOnly('Call Lifeline, 13 11 14', '131114') },
  other: { region: 'other', segments: US_SEGMENTS, extra: 'or your local emergency number' },
};

/** The choices in Settings, in display order. */
export const CRISIS_CHOICES: readonly { value: CrisisChoice; label: string }[] = [
  { value: 'auto', label: 'Automatic' },
  { value: 'us', label: 'United States' },
  { value: 'ca', label: 'Canada' },
  { value: 'uk-ie', label: 'UK & Ireland' },
  { value: 'au', label: 'Australia' },
  { value: 'other', label: 'Anywhere else' },
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
export function resolveCrisisLine(choice: CrisisChoice, locales: readonly string[]): CrisisLineInfo {
  return CRISIS_LINES[choice === 'auto' ? regionFromLocales(locales) : choice];
}

/** The line as plain text (no links). */
export function crisisLineText(line: CrisisLineInfo): string {
  return line.segments.map((s) => s.text).join('');
}
