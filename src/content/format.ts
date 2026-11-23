import type { Helped } from '../platform/storage';
import { en, type Strings } from './strings';

/** "40 sec", "90 sec", "1 min", "3 min" — short enough for a card. */
export function formatDuration(seconds: number, units: Strings['units'] = en.units): string {
  if (seconds < 60 || (seconds < 120 && seconds % 60 !== 0)) return `${Math.round(seconds)} ${units.sec}`;
  return `${Math.round(seconds / 60)} ${units.min}`;
}

/** The four "What helped?" answers, in display order. */
export const HELPED_VALUES: readonly Helped[] = ['breathing', 'grounding', 'both', 'not-sure'];

export function helpedLabel(helped: Helped, s: Strings = en): string {
  return s.helped[helped] ?? helped;
}

/** "Fri, Nov 20 · 5:37 PM" in the user's own locale. Returns '' for an unparseable date. */
export function formatWhen(iso: string, locale?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const day = new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' }).format(date);
  const time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(date);
  return `${day} · ${time}`;
}
