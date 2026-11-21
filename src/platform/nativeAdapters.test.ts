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
  };
});

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
