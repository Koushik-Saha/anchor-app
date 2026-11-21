/**
 * In-app purchase adapter for the one-time unlock. Use as a namespace:
 *   import * as purchases from '../platform/purchases';
 *
 * Native: StoreKit 2 (iOS) / Google Play Billing (Android) via @capgo/native-purchases
 * (see nativeAdapters.ts) — talks only to Apple / Google, no third-party server, no keys
 * (CLAUDE.md rule 1). Web: unavailable — there are no web payments.
 *
 * Purchases are a one-way door: the unlock is only ever granted here, never revoked
 * automatically (an offline or flaky store must never take features away mid-panic).
 * Nothing here ever throws.
 */

/** The single non-consumable product, identical in App Store Connect and Play Console. */
export const UNLOCK_PRODUCT_ID = 'full_unlock';
/** Shown until the store returns the localized price. */
export const UNLOCK_FALLBACK_PRICE = '$6.99';

export type PurchaseOutcome = 'purchased' | 'pending' | 'cancelled' | 'failed' | 'unavailable';

export interface PurchasesAdapter {
  /** In-app purchase is possible here (native app with a store). */
  readonly available: boolean;
  /** Localized price string from the store, e.g. "$6.99" / "6,99 €". */
  getUnlockPrice(): Promise<string | null>;
  purchaseUnlock(): Promise<PurchaseOutcome>;
  /** Re-syncs with the store (may ask the user to sign in on iOS). True if the unlock is owned. */
  restore(): Promise<boolean>;
  /** Silent check of current entitlements — never prompts. */
  ownsUnlock(): Promise<boolean>;
  /** Fires when the store later confirms the unlock (e.g. a pending payment completes). */
  onUnlockGranted(listener: () => void): () => void;
}

/** The fields of a store transaction we rely on (both platforms). */
export interface StoreTransaction {
  productIdentifier: string;
  /** Android only: "1" = purchased, "0" = pending. Absent on iOS. */
  purchaseState?: string;
  /** Set when Apple refunded / revoked it. */
  revocationDate?: string;
}

/** Does this transaction grant the unlock? */
export function grantsUnlock(t: StoreTransaction): boolean {
  return (
    t.productIdentifier === UNLOCK_PRODUCT_ID &&
    !t.revocationDate &&
    (t.purchaseState === undefined || t.purchaseState === '1')
  );
}

/** Maps a rejected purchase call to an outcome. */
export function classifyPurchaseError(error: unknown): 'cancelled' | 'already-owned' | 'failed' {
  const text =
    error && typeof error === 'object'
      ? `${String((error as { code?: unknown }).code ?? '')} ${String((error as { message?: unknown }).message ?? '')}`
      : String(error);
  if (/cancel/i.test(text)) return 'cancelled';
  if (/already[_ ]?owned/i.test(text)) return 'already-owned';
  return 'failed';
}

export const webPurchases: PurchasesAdapter = {
  available: false,
  getUnlockPrice: async () => null,
  purchaseUnlock: async () => 'unavailable',
  restore: async () => false,
  ownsUnlock: async () => false,
  onUnlockGranted: () => () => undefined,
};

// ─── Module API (what call sites use) ────────────────────────────────────────

let adapter: PurchasesAdapter = webPurchases;

export function setAdapter(next: PurchasesAdapter): void {
  adapter = next;
}

export function isAvailable(): boolean {
  return adapter.available;
}

export async function getUnlockPrice(): Promise<string> {
  try {
    return (await adapter.getUnlockPrice()) ?? UNLOCK_FALLBACK_PRICE;
  } catch {
    return UNLOCK_FALLBACK_PRICE;
  }
}

export async function purchaseUnlock(): Promise<PurchaseOutcome> {
  try {
    return await adapter.purchaseUnlock();
  } catch {
    return 'failed';
  }
}

export async function restore(): Promise<boolean> {
  try {
    return await adapter.restore();
  } catch {
    return false;
  }
}

export async function ownsUnlock(): Promise<boolean> {
  try {
    return await adapter.ownsUnlock();
  } catch {
    return false;
  }
}

export function onUnlockGranted(listener: () => void): () => void {
  try {
    return adapter.onUnlockGranted(() => {
      try {
        listener();
      } catch {
        /* ignore */
      }
    });
  } catch {
    return () => undefined;
  }
}
