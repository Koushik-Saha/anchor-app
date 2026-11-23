import type { PanicPlan } from '../platform/storage';

/** Field limits: short enough to read at a glance on the Done screen. */
export const PLAN_LIMITS = { note: 120, contactName: 60, contactPhone: 30, medsNote: 500 } as const;

/**
 * A safe `tel:` link from whatever the person typed ("+1 (555) 010-0199", "555 0100").
 * Keeps digits and a leading +, plus pause/wait characters; null if it can't be a number.
 */
export function telHref(phone: string | undefined): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  const plus = trimmed.startsWith('+') ? '+' : '';
  const digits = trimmed.replace(/[^0-9,;]/g, '').replace(/^[,;]+/, '');
  if ((digits.match(/[0-9]/g) ?? []).length < 3) return null;
  return `tel:${plus}${digits}`;
}

/**
 * What Done shows from My plan: the person's note and a one-tap call link.
 * Depends only on what they saved: Anchor is free, so nothing else can hide it.
 */
export function planOnDone(plan: PanicPlan | undefined): { note: string | undefined; tel: string | null } {
  const note = plan?.note?.trim() || undefined;
  return { note, tel: telHref(plan?.contactPhone) };
}

/** Label for the one-tap call button on Done. */
export function callLabel(plan: PanicPlan | undefined): string {
  const name = plan?.contactName?.trim();
  return name ? `Call ${name}` : 'Call my contact';
}

/** Trims fields and drops empty ones, so an emptied field truly disappears. */
export function cleanPlan(plan: PanicPlan): PanicPlan {
  const out: PanicPlan = {};
  for (const key of ['note', 'contactName', 'contactPhone', 'medsNote'] as const) {
    const value = plan[key]?.trim();
    if (value) out[key] = value.slice(0, PLAN_LIMITS[key]);
  }
  return out;
}

export function isPlanEmpty(plan: PanicPlan | undefined): boolean {
  return !plan || Object.keys(cleanPlan(plan)).length === 0;
}
