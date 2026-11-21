/**
 * Storage adapter — the ONLY module allowed to touch persistent storage (CLAUDE.md rule 3).
 *
 * Everything stays on this device. Layers:
 *   StorageBackend  — raw async string key/value. Web: localStorage (falls back to
 *                     memory if blocked). Native later: @capacitor/preferences, which
 *                     has the same async get/set/remove shape.
 *   createStorage() — JSON get/set/remove + typed helpers for the LocalData shape.
 *   storage         — the app-wide instance. Call sites only ever use this.
 *
 * To go native (Phase 3), call setStorageBackend(nativeBackend) once at startup;
 * no call site changes. Nothing here ever throws.
 */
import type { TonePitch } from './audio';

// ─── LocalData shape (spec §2.5) ─────────────────────────────────────────────

export interface Settings {
  haptics: boolean;
  sound: boolean;
  largeText: boolean;
  tonePitch: TonePitch;
}

export type Helped = 'breathing' | 'grounding' | 'both' | 'not-sure';

export interface HistoryEntry {
  /** ISO timestamp. */
  at: string;
  protocolId: string;
  completed: boolean;
  helped?: Helped;
}

export interface PanicPlan {
  contactName?: string;
  contactPhone?: string;
  note?: string;
  medsNote?: string;
}

export interface LocalData {
  settings: Settings;
  history: HistoryEntry[];
  unlocked: boolean;
  panicPlan?: PanicPlan;
}

export type StorageKey = keyof LocalData;

const STORAGE_KEYS = ['settings', 'history', 'unlocked', 'panicPlan'] as const satisfies readonly StorageKey[];
const PREFIX = 'anchor:v1:';
/** Oldest entries are dropped beyond this, so storage can't grow forever. */
export const MAX_HISTORY = 500;

/** Calm defaults: haptics on, sound off (no sound by default), normal text. */
export const DEFAULT_SETTINGS: Readonly<Settings> = {
  haptics: true,
  sound: false,
  largeText: false,
  tonePitch: 'low',
};

// ─── Validation: stored data may be old, partial or corrupt ──────────────────

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const HELPED: readonly Helped[] = ['breathing', 'grounding', 'both', 'not-sure'];
const isHelped = (v: unknown): v is Helped => HELPED.some((h) => h === v);

export function normalizeSettings(raw: unknown): Settings {
  const r = isRecord(raw) ? raw : {};
  const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);
  return {
    haptics: bool(r.haptics, DEFAULT_SETTINGS.haptics),
    sound: bool(r.sound, DEFAULT_SETTINGS.sound),
    largeText: bool(r.largeText, DEFAULT_SETTINGS.largeText),
    tonePitch: r.tonePitch === 'low' || r.tonePitch === 'mid' ? r.tonePitch : DEFAULT_SETTINGS.tonePitch,
  };
}

/** Keeps only well-formed entries. */
export function normalizeHistory(raw: unknown): HistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  const entries: HistoryEntry[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const { at, protocolId, completed, helped } = item;
    if (typeof at !== 'string' || typeof protocolId !== 'string' || typeof completed !== 'boolean') continue;
    entries.push(isHelped(helped) ? { at, protocolId, completed, helped } : { at, protocolId, completed });
  }
  return entries;
}

export function normalizePanicPlan(raw: unknown): PanicPlan | undefined {
  if (!isRecord(raw)) return undefined;
  const plan: PanicPlan = {};
  for (const field of ['contactName', 'contactPhone', 'note', 'medsNote'] as const) {
    const value = raw[field];
    if (typeof value === 'string') plan[field] = value;
  }
  return plan;
}

// ─── Backends ────────────────────────────────────────────────────────────────

/** Raw async string key/value store — matches @capacitor/preferences' shape. */
export interface StorageBackend {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export function createMemoryBackend(): StorageBackend {
  const map = new Map<string, string>();
  return {
    getItem: async (key) => map.get(key) ?? null,
    setItem: async (key, value) => void map.set(key, value),
    removeItem: async (key) => void map.delete(key),
  };
}

/** localStorage, or memory if it is missing/blocked (private mode, disabled site data). */
export function createWebStorageBackend(): StorageBackend {
  try {
    const ls = typeof localStorage === 'undefined' ? undefined : localStorage;
    if (!ls) return createMemoryBackend();
    const probe = `${PREFIX}__probe__`;
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return {
      getItem: async (key) => ls.getItem(key),
      setItem: async (key, value) => ls.setItem(key, value),
      removeItem: async (key) => ls.removeItem(key),
    };
  } catch {
    return createMemoryBackend();
  }
}

// ─── JSON layer + typed helpers ──────────────────────────────────────────────

export interface AppStorage {
  /** Parsed JSON, or undefined if missing/corrupt. Unvalidated — prefer the typed helpers. */
  getJSON(key: StorageKey): Promise<unknown>;
  /** Resolves false if the write failed (quota, blocked storage). */
  setJSON<K extends StorageKey>(key: K, value: LocalData[K]): Promise<boolean>;
  remove(key: StorageKey): Promise<void>;
  /** Deletes every Anchor key on this device. */
  clearAll(): Promise<void>;

  getSettings(): Promise<Settings>;
  saveSettings(settings: Settings): Promise<boolean>;

  /** Oldest first. */
  getHistory(): Promise<HistoryEntry[]>;
  addHistoryEntry(entry: HistoryEntry): Promise<boolean>;
  clearHistory(): Promise<void>;

  isUnlocked(): Promise<boolean>;
  setUnlocked(unlocked: boolean): Promise<boolean>;

  getPanicPlan(): Promise<PanicPlan | undefined>;
  savePanicPlan(plan: PanicPlan): Promise<boolean>;
}

export function createStorage(backend: StorageBackend): AppStorage {
  const getJSON = async (key: StorageKey): Promise<unknown> => {
    try {
      const raw = await backend.getItem(PREFIX + key);
      return raw === null ? undefined : (JSON.parse(raw) as unknown);
    } catch {
      return undefined;
    }
  };

  const remove = async (key: StorageKey): Promise<void> => {
    try {
      await backend.removeItem(PREFIX + key);
    } catch {
      /* ignore */
    }
  };

  const setJSON = async <K extends StorageKey>(key: K, value: LocalData[K]): Promise<boolean> => {
    if (value === undefined) {
      await remove(key);
      return true;
    }
    try {
      await backend.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch {
      return false; // never crash the reset flow over storage
    }
  };

  const getHistory = async () => normalizeHistory(await getJSON('history'));

  return {
    getJSON,
    setJSON,
    remove,
    async clearAll() {
      for (const key of STORAGE_KEYS) await remove(key);
    },

    getSettings: async () => normalizeSettings(await getJSON('settings')),
    saveSettings: (settings) => setJSON('settings', settings),

    getHistory,
    async addHistoryEntry(entry) {
      const history = await getHistory();
      return setJSON('history', [...history, entry].slice(-MAX_HISTORY));
    },
    clearHistory: () => remove('history'),

    isUnlocked: async () => (await getJSON('unlocked')) === true,
    setUnlocked: (unlocked) => setJSON('unlocked', unlocked),

    getPanicPlan: async () => normalizePanicPlan(await getJSON('panicPlan')),
    savePanicPlan: (plan) => setJSON('panicPlan', plan),
  };
}

// ─── App-wide instance with a swappable backend ──────────────────────────────

let activeBackend: StorageBackend = createWebStorageBackend();

/** Swap in a native backend at startup (Phase 3). Call sites don't change. */
export function setStorageBackend(backend: StorageBackend): void {
  activeBackend = backend;
}

export const storage: AppStorage = createStorage({
  getItem: (key) => activeBackend.getItem(key),
  setItem: (key, value) => activeBackend.setItem(key, value),
  removeItem: (key) => activeBackend.removeItem(key),
});
