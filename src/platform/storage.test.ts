import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  MAX_HISTORY,
  createMemoryBackend,
  createStorage,
  createWebStorageBackend,
  normalizeHistory,
  normalizePanicPlan,
  normalizeSettings,
  setStorageBackend,
  storage,
  type HistoryEntry,
  type StorageBackend,
} from './storage';

const entry = (i: number, extra: Partial<HistoryEntry> = {}): HistoryEntry => ({
  at: new Date(Date.UTC(2026, 10, 20, 0, i)).toISOString(),
  protocolId: 'classic-90',
  completed: true,
  ...extra,
});

const brokenBackend: StorageBackend = {
  getItem: () => Promise.reject(new Error('blocked')),
  setItem: () => {
    throw new Error('quota');
  },
  removeItem: () => Promise.reject(new Error('blocked')),
};

describe('JSON layer', () => {
  it('round-trips values and removes them', async () => {
    const s = createStorage(createMemoryBackend());
    expect(await s.setJSON('unlocked', true)).toBe(true);
    expect(await s.getJSON('unlocked')).toBe(true);
    await s.remove('unlocked');
    expect(await s.getJSON('unlocked')).toBeUndefined();
  });

  it('namespaces keys so other apps on the origin are untouched', async () => {
    const backend = createMemoryBackend();
    await createStorage(backend).setJSON('unlocked', true);
    expect(await backend.getItem('anchor:v1:unlocked')).toBe('true');
    expect(await backend.getItem('unlocked')).toBeNull();
  });

  it('returns undefined for corrupt JSON instead of throwing', async () => {
    const backend = createMemoryBackend();
    await backend.setItem('anchor:v1:settings', '{not json');
    expect(await createStorage(backend).getJSON('settings')).toBeUndefined();
  });

  it('setting panicPlan to undefined removes it', async () => {
    const s = createStorage(createMemoryBackend());
    await s.savePanicPlan({ note: 'This passes.' });
    await s.setJSON('panicPlan', undefined);
    expect(await s.getPanicPlan()).toBeUndefined();
  });

  it('never throws when the backend fails (sync or async)', async () => {
    const s = createStorage(brokenBackend);
    expect(await s.setJSON('unlocked', true)).toBe(false);
    expect(await s.getJSON('unlocked')).toBeUndefined();
    expect(await s.getSettings()).toEqual(DEFAULT_SETTINGS);
    expect(await s.getHistory()).toEqual([]);
    expect(await s.addHistoryEntry(entry(1))).toBe(false);
    await expect(s.clearAll()).resolves.toBeUndefined();
  });

  it('web backend falls back to memory when localStorage is unavailable (Node)', async () => {
    const s = createStorage(createWebStorageBackend());
    await s.setUnlocked(true);
    expect(await s.isUnlocked()).toBe(true);
  });
});

describe('typed helpers', () => {
  it('settings: defaults when empty, then round-trip', async () => {
    const s = createStorage(createMemoryBackend());
    expect(await s.getSettings()).toEqual(DEFAULT_SETTINGS);
    const next = { ...DEFAULT_SETTINGS, sound: true, tonePitch: 'mid' as const };
    await s.saveSettings(next);
    expect(await s.getSettings()).toEqual(next);
  });

  it('history: appends in order, caps at MAX_HISTORY, clears', async () => {
    const s = createStorage(createMemoryBackend());
    await s.addHistoryEntry(entry(1));
    await s.addHistoryEntry(entry(2, { helped: 'breathing' }));
    expect(await s.getHistory()).toEqual([entry(1), entry(2, { helped: 'breathing' })]);

    await s.setJSON('history', Array.from({ length: MAX_HISTORY }, (_, i) => entry(i)));
    await s.addHistoryEntry(entry(9999));
    const history = await s.getHistory();
    expect(history).toHaveLength(MAX_HISTORY);
    expect(history[0]).toEqual(entry(1)); // oldest dropped
    expect(history.at(-1)).toEqual(entry(9999));

    await s.clearHistory();
    expect(await s.getHistory()).toEqual([]);
  });

  it('history: setHistoryHelped updates the completed run saved at that time', async () => {
    const s = createStorage(createMemoryBackend());
    await s.addHistoryEntry(entry(1));
    await s.addHistoryEntry(entry(2));
    expect(await s.setHistoryHelped(entry(2).at, 'both')).toBe(true);
    expect(await s.getHistory()).toEqual([entry(1), entry(2, { helped: 'both' })]);

    // Changing your answer overwrites it.
    await s.setHistoryHelped(entry(2).at, 'not-sure');
    expect((await s.getHistory())[1]?.helped).toBe('not-sure');
  });

  it('history: setHistoryHelped refuses unknown runs and aborted runs', async () => {
    const s = createStorage(createMemoryBackend());
    await s.addHistoryEntry(entry(1, { completed: false }));
    expect(await s.setHistoryHelped('2000-01-01T00:00:00.000Z', 'both')).toBe(false);
    expect(await s.setHistoryHelped(entry(1).at, 'both')).toBe(false);
    expect(await s.getHistory()).toEqual([entry(1, { completed: false })]);
  });

  it('history: concurrent writes never lose entries or answers', async () => {
    const s = createStorage(createMemoryBackend());
    // Not awaited one by one — like a run finishing and an answer tapped right away.
    const writes = [s.addHistoryEntry(entry(1)), s.setHistoryHelped(entry(1).at, 'breathing')];
    for (let i = 2; i <= 6; i++) writes.push(s.addHistoryEntry(entry(i)));
    await Promise.all(writes);
    const history = await s.getHistory();
    expect(history).toHaveLength(6);
    expect(history[0]).toEqual(entry(1, { helped: 'breathing' }));
  });

  it('unlocked: false unless exactly true', async () => {
    const backend = createMemoryBackend();
    const s = createStorage(backend);
    expect(await s.isUnlocked()).toBe(false);
    await backend.setItem('anchor:v1:unlocked', '"true"');
    expect(await s.isUnlocked()).toBe(false);
    await s.setUnlocked(true);
    expect(await s.isUnlocked()).toBe(true);
  });

  it('panic plan round-trips', async () => {
    const s = createStorage(createMemoryBackend());
    const plan = { contactName: 'Sam', contactPhone: '+15550100', note: 'This passes.' };
    await s.savePanicPlan(plan);
    expect(await s.getPanicPlan()).toEqual(plan);
  });

  it('clearAll removes every key', async () => {
    const s = createStorage(createMemoryBackend());
    await s.setUnlocked(true);
    await s.addHistoryEntry(entry(1));
    await s.savePanicPlan({ note: 'x' });
    await s.saveSettings({ ...DEFAULT_SETTINGS, largeText: true });
    await s.clearAll();
    expect(await s.isUnlocked()).toBe(false);
    expect(await s.getHistory()).toEqual([]);
    expect(await s.getPanicPlan()).toBeUndefined();
    expect(await s.getSettings()).toEqual(DEFAULT_SETTINGS);
  });
});

describe('setStorageBackend', () => {
  it('redirects the app-wide storage instance without changing call sites', async () => {
    const native = createMemoryBackend();
    setStorageBackend(native);
    await storage.setUnlocked(true);
    expect(await native.getItem('anchor:v1:unlocked')).toBe('true');
  });
});

describe('normalizeSettings', () => {
  it('returns defaults for missing or non-object data', () => {
    for (const raw of [undefined, null, 'largeText', [true], 42]) {
      expect(normalizeSettings(raw)).toEqual(DEFAULT_SETTINGS);
    }
  });

  it('keeps a full valid settings object as-is', () => {
    const stored = { haptics: false, sound: true, largeText: true, reducedMotion: true, tonePitch: 'mid', installHintDismissed: true };
    expect(normalizeSettings(stored)).toEqual(stored);
  });

  it('settings saved before reducedMotion existed get it defaulted to false', () => {
    expect(normalizeSettings({ haptics: false, sound: true, largeText: true, tonePitch: 'mid' }).reducedMotion).toBe(false);
  });

  it('fills missing fields from defaults and replaces wrongly-typed ones', () => {
    expect(normalizeSettings({ largeText: true })).toEqual({ ...DEFAULT_SETTINGS, largeText: true });
    expect(normalizeSettings({ largeText: 'yes', tonePitch: 'high', extra: 1 })).toEqual(DEFAULT_SETTINGS);
  });
});

describe('normalizeHistory', () => {
  it('keeps well-formed entries and drops the rest', () => {
    const raw = [
      entry(1),
      { ...entry(2), helped: 'nonsense' }, // invalid helped → dropped field, entry kept
      { at: 1, protocolId: 'x', completed: true },
      { at: 'x', protocolId: 'x' },
      null,
      'entry',
    ];
    expect(normalizeHistory(raw)).toEqual([entry(1), entry(2)]);
    expect(normalizeHistory({ not: 'an array' })).toEqual([]);
  });
});

describe('normalizePanicPlan', () => {
  it('keeps only known string fields', () => {
    expect(normalizePanicPlan({ note: 'hi', contactPhone: 5, other: 'x' })).toEqual({ note: 'hi' });
    expect(normalizePanicPlan('plan')).toBeUndefined();
  });
});
