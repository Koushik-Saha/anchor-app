import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mock the Capacitor plugins (the real ones need a device) ────────────────
const mocks = vi.hoisted(() => {
  const prefs = new Map<string, string>();
  const appListeners: ((e: { url: string }) => void)[] = [];
  return {
    prefs,
    appListeners,
    launchUrl: { value: undefined as { url: string } | undefined },
    impact: vi.fn<(options: { style: string }) => Promise<void>>(async () => undefined),
    notification: vi.fn<(options: { type: string }) => Promise<void>>(async () => undefined),
    keepAwake: vi.fn(async () => undefined),
    allowSleep: vi.fn(async () => undefined),
    removeListener: vi.fn(async () => undefined),
    store: {
      purchase: vi.fn<() => Promise<{ productIdentifier: string; purchaseState?: string }>>(),
      owned: [] as { productIdentifier: string; purchaseState?: string; revocationDate?: string }[],
      restore: vi.fn(async () => undefined),
      getPurchasesArgs: [] as unknown[],
      listeners: [] as ((t: { productIdentifier: string; purchaseState?: string }) => void)[],
    },
  };
});

vi.mock('@capgo/native-purchases', () => ({
  PURCHASE_TYPE: { INAPP: 'inapp', SUBS: 'subs' },
  NativePurchases: {
    getProduct: async () => ({ product: { priceString: '6,99 €' } }),
    purchaseProduct: mocks.store.purchase,
    restorePurchases: mocks.store.restore,
    getPurchases: async (args: unknown) => {
      mocks.store.getPurchasesArgs.push(args);
      return { purchases: mocks.store.owned };
    },
    addListener: async (_event: 'transactionUpdated', cb: (t: { productIdentifier: string }) => void) => {
      mocks.store.listeners.push(cb);
      return { remove: mocks.removeListener };
    },
  },
}));

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: async ({ key }: { key: string }) => ({ value: mocks.prefs.get(key) ?? null }),
    set: async ({ key, value }: { key: string; value: string }) => void mocks.prefs.set(key, value),
    remove: async ({ key }: { key: string }) => void mocks.prefs.delete(key),
  },
}));
vi.mock('@capacitor/haptics', () => ({
  Haptics: { impact: mocks.impact, notification: mocks.notification },
  ImpactStyle: { Light: 'LIGHT', Medium: 'MEDIUM', Heavy: 'HEAVY' },
  NotificationType: { Success: 'SUCCESS', Warning: 'WARNING', Error: 'ERROR' },
}));
vi.mock('@capacitor-community/keep-awake', () => ({
  KeepAwake: { keepAwake: mocks.keepAwake, allowSleep: mocks.allowSleep },
}));
vi.mock('@capacitor/app', () => ({
  App: {
    getLaunchUrl: async () => mocks.launchUrl.value,
    addListener: async (_event: 'appUrlOpen', cb: (e: { url: string }) => void) => {
      mocks.appListeners.push(cb);
      return { remove: mocks.removeListener };
    },
  },
}));

const native = await import('./nativeAdapters');
const deepLinks = await import('./deepLinks');
const haptics = await import('./haptics');
const wakeLock = await import('./wakeLock');
const { createStorage, storage } = await import('./storage');

beforeEach(() => {
  mocks.prefs.clear();
  mocks.appListeners.length = 0;
  mocks.launchUrl.value = undefined;
  mocks.store.owned = [];
  mocks.store.getPurchasesArgs.length = 0;
  mocks.store.listeners.length = 0;
  vi.clearAllMocks();
});

describe('Preferences storage backend', () => {
  it('stores Anchor data in Capacitor Preferences (namespaced)', async () => {
    const s = createStorage(native.createPreferencesBackend());
    await s.setUnlocked(true);
    await s.addHistoryEntry({ at: '2026-11-20T00:00:00.000Z', protocolId: 'classic-90', completed: true });
    expect(mocks.prefs.get('anchor:v1:unlocked')).toBe('true');
    expect(await s.isUnlocked()).toBe(true);
    expect(await s.getHistory()).toHaveLength(1);
    await s.clearAll();
    expect(mocks.prefs.size).toBe(0);
  });
});

describe('native haptics', () => {
  it('maps tap / phase / done to light impact / medium impact / success', async () => {
    const h = native.createNativeHaptics();
    expect(h.supported).toBe(true);
    await h.pulse('tap');
    await h.pulse('phase');
    await h.pulse('done');
    expect(mocks.impact.mock.calls).toEqual([[{ style: 'LIGHT' }], [{ style: 'MEDIUM' }]]);
    expect(mocks.notification).toHaveBeenCalledWith({ type: 'SUCCESS' });
  });
});

describe('native keep-awake', () => {
  it('keeps the screen on while held, allows sleep on release', async () => {
    const lock = native.createNativeKeepAwake();
    await lock.acquire();
    expect(mocks.keepAwake).toHaveBeenCalledOnce();
    expect(lock.isHeld()).toBe(true);
    await lock.release();
    expect(mocks.allowSleep).toHaveBeenCalledOnce();
    expect(lock.isHeld()).toBe(false);
  });
});

describe('native deep links', () => {
  it('reports the cold-start URL and URLs opened while running', async () => {
    const links = native.createNativeDeepLinks();
    expect(await links.getLaunchUrl()).toBeNull();
    mocks.launchUrl.value = { url: 'anchor://start' };
    expect(await links.getLaunchUrl()).toBe('anchor://start');

    const seen: string[] = [];
    const unsubscribe = links.onOpenUrl((url) => seen.push(url));
    await Promise.resolve();
    mocks.appListeners.forEach((cb) => cb({ url: 'anchor://start' }));
    expect(seen).toEqual(['anchor://start']);
    unsubscribe();
    await Promise.resolve();
    await Promise.resolve();
    expect(mocks.removeListener).toHaveBeenCalledOnce();
  });
});

describe('installNativeAdapters', () => {
  it('switches every adapter without changing call sites', async () => {
    native.installNativeAdapters();

    await storage.setUnlocked(true); // the app-wide instance now writes to Preferences
    expect(mocks.prefs.get('anchor:v1:unlocked')).toBe('true');

    haptics.setEnabled(true);
    haptics.pulse('phase');
    expect(mocks.impact).toHaveBeenCalledWith({ style: 'MEDIUM' });

    await wakeLock.acquire();
    expect(mocks.keepAwake).toHaveBeenCalled();
    await wakeLock.release();

    mocks.launchUrl.value = { url: 'anchor://start' };
    expect(await deepLinks.getLaunchUrl()).toBe('anchor://start');
  });
});

describe('native purchases (StoreKit / Play Billing)', () => {
  const unlock = { productIdentifier: 'full_unlock' };

  it('reports the localized store price', async () => {
    expect(await native.createNativePurchases().getUnlockPrice()).toBe('6,99 €');
  });

  it('purchase: purchased / pending (Android "0") / cancelled / failed', async () => {
    const store = native.createNativePurchases();
    mocks.store.purchase.mockResolvedValueOnce({ ...unlock, purchaseState: '1' });
    expect(await store.purchaseUnlock()).toBe('purchased');
    mocks.store.purchase.mockResolvedValueOnce({ ...unlock, purchaseState: '0' });
    expect(await store.purchaseUnlock()).toBe('pending');
    mocks.store.purchase.mockRejectedValueOnce(new Error('User cancelled'));
    expect(await store.purchaseUnlock()).toBe('cancelled');
    mocks.store.purchase.mockRejectedValueOnce(new Error('Network down'));
    expect(await store.purchaseUnlock()).toBe('failed');
  });

  it('already owned (Android): verifies ownership instead of failing', async () => {
    const store = native.createNativePurchases();
    mocks.store.purchase.mockRejectedValueOnce({ code: 'ITEM_ALREADY_OWNED' });
    mocks.store.owned = [{ ...unlock, purchaseState: '1' }];
    expect(await store.purchaseUnlock()).toBe('purchased');
  });

  it('restore re-syncs with the store, then checks current entitlements only', async () => {
    const store = native.createNativePurchases();
    expect(await store.restore()).toBe(false); // fresh account: nothing to restore
    mocks.store.owned = [unlock];
    expect(await store.restore()).toBe(true);
    expect(mocks.store.restore).toHaveBeenCalledTimes(2);
    expect(mocks.store.getPurchasesArgs.at(-1)).toEqual({ productType: 'inapp', onlyCurrentEntitlements: true });
  });

  it('a refunded or pending unlock is not treated as owned', async () => {
    const store = native.createNativePurchases();
    mocks.store.owned = [{ ...unlock, revocationDate: '2026-11-20T00:00:00Z' }, { ...unlock, purchaseState: '0' }];
    expect(await store.ownsUnlock()).toBe(false);
  });

  it('grants the unlock when the store confirms later (transactionUpdated)', async () => {
    const store = native.createNativePurchases();
    const granted = vi.fn();
    store.onUnlockGranted(granted);
    await Promise.resolve();
    mocks.store.listeners.forEach((cb) => cb({ productIdentifier: 'other' }));
    mocks.store.listeners.forEach((cb) => cb({ ...unlock, purchaseState: '1' }));
    expect(granted).toHaveBeenCalledOnce();
  });
});
