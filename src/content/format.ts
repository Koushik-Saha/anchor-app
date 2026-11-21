import type { Helped } from '../platform/storage';

/** "40 sec", "90 sec", "1 min", "3 min" — short enough for a card. */
export function formatDuration(seconds: number): string {
  if (seconds < 60 || (seconds < 120 && seconds % 60 !== 0)) return `${Math.round(seconds)} sec`;
  return `${Math.round(seconds / 60)} min`;
}

/** The four "What helped?" answers, in display order. */
export const HELPED_OPTIONS: readonly { value: Helped; label: string }[] = [
  { value: 'breathing', label: 'Breathing' },
  { value: 'grounding', label: 'Grounding' },
  { value: 'both', label: 'Both' },
  { value: 'not-sure', label: 'Not sure' },
];

export function helpedLabel(helped: Helped): string {
  return HELPED_OPTIONS.find((o) => o.value === helped)?.label ?? helped;
}

/** Price of the one-time unlock. Shown before purchase is wired up; the store price will replace it. */
export const UNLOCK_PRICE = '$6.99';

/** "Fri, Nov 20 · 5:37 PM" in the user's own locale. Returns '' for an unparseable date. */
export function formatWhen(iso: string, locale?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const day = new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' }).format(date);
  const time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(date);
  return `${day} · ${time}`;
}
