import { afterEach, describe, expect, it } from 'vitest';
import * as purchases from './purchases';
import { UNLOCK_FALLBACK_PRICE, classifyPurchaseError, grantsUnlock, webPurchases, type PurchasesAdapter } from './purchases';

describe('grantsUnlock', () => {
  it('accepts the unlock on iOS (no purchaseState) and Android (purchaseState "1")', () => {
    expect(grantsUnlock({ productIdentifier: 'full_unlock' })).toBe(true);
    expect(grantsUnlock({ productIdentifier: 'full_unlock', purchaseState: '1' })).toBe(true);
  });

  it('rejects other products, pending payments and refunds', () => {
    expect(grantsUnlock({ productIdentifier: 'something_else' })).toBe(false);
    expect(grantsUnlock({ productIdentifier: 'full_unlock', purchaseState: '0' })).toBe(false);
    expect(grantsUnlock({ productIdentifier: 'full_unlock', revocationDate: '2026-11-20T00:00:00Z' })).toBe(false);
  });
});

describe('classifyPurchaseError', () => {
  it('recognises cancellation on both platforms', () => {
    expect(classifyPurchaseError(new Error('User cancelled'))).toBe('cancelled'); // iOS
    expect(classifyPurchaseError({ code: 'USER_CANCELED', message: 'x' })).toBe('cancelled'); // Android
  });

  it('recognises an already-owned item', () => {
    expect(classifyPurchaseError({ code: 'ITEM_ALREADY_OWNED' })).toBe('already-owned');
  });

  it('treats everything else as a failure', () => {
    expect(classifyPurchaseError(new Error('Network unavailable'))).toBe('failed');
    expect(classifyPurchaseError(undefined)).toBe('failed');
  });
});

describe('module API', () => {
  afterEach(() => purchases.setAdapter(webPurchases));

  it('is unavailable on the web: no purchase, no restore, fallback price', async () => {
    expect(purchases.isAvailable()).toBe(false);
    expect(await purchases.purchaseUnlock()).toBe('unavailable');
    expect(await purchases.restore()).toBe(false);
    expect(await purchases.ownsUnlock()).toBe(false);
    expect(await purchases.getUnlockPrice()).toBe(UNLOCK_FALLBACK_PRICE);
  });

  it('never throws, even when the store adapter does', async () => {
    const boom = () => Promise.reject(new Error('store down'));
    const broken: PurchasesAdapter = {
      available: true,
      getUnlockPrice: boom,
      purchaseUnlock: boom,
      restore: boom,
      ownsUnlock: boom,
      onUnlockGranted: () => {
        throw new Error('no listener');
      },
    };
    purchases.setAdapter(broken);
    expect(await purchases.purchaseUnlock()).toBe('failed');
    expect(await purchases.restore()).toBe(false);
    expect(await purchases.ownsUnlock()).toBe(false);
    expect(await purchases.getUnlockPrice()).toBe(UNLOCK_FALLBACK_PRICE);
    expect(() => purchases.onUnlockGranted(() => undefined)()).not.toThrow();
  });
});
