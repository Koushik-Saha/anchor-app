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

/** Which crisis line to show. */
export type CrisisRegion = 'us' | 'ca' | 'uk-ie' | 'au' | 'other';
/** 'auto' follows the device locale; anything else is the person's own choice. */
export type CrisisChoice = 'auto' | CrisisRegion;

/** UI language: 'auto' follows the device. Independent of the crisis line. */
export type LanguageChoice = 'auto' | 'en' | 'es';

export interface Settings {
  haptics: boolean;
  sound: boolean;
  largeText: boolean;
  /** App-level reduce motion. The OS setting is honoured too, independently. */
  reducedMotion: boolean;
  tonePitch: TonePitch;
  /** "Add to Home Screen" hint dismissed with "Not now". */
  installHintDismissed: boolean;
  /**
   * Last breathing pattern picked for "Just breathing" (an id from content/breathPatterns.ts).
   * Kept as a plain string here; content resolves unknown ids to the default pattern.
   */
  breathPattern: string;
  /** Crisis line shown on Home and Done. */
  crisisRegion: CrisisChoice;
  language: LanguageChoice;
}

export type Helped = 'breathing' | 'grounding' | 'both' | 'not-sure';

export interface HistoryEntry {
  /** ISO timestamp. */
  at: string;
  protocolId: string;
  /** The custom reset's name when it ran, so history keeps it even after it's changed or deleted. */
  protocolName?: string;
  completed: boolean;
  helped?: Helped;
}

export interface PanicPlan {
  contactName?: string;
  contactPhone?: string;
  note?: string;
  medsNote?: string;
}

export type CustomStep = 'breathing' | 'grounding' | 'lines';

/** The person's one custom reset (see content/customReset.ts). */
export interface CustomReset {
  name: string;
  /** In playing order. Each at most once; breathing is required. */
  steps: CustomStep[];
  patternId: string;
  breathSec: 30 | 60 | 90;
  linesLength: 'short' | 'standard';
}

export const CUSTOM_NAME_MAX = 24;

export interface LocalData {
  settings: Settings;
  history: HistoryEntry[];
  panicPlan?: PanicPlan;
  customReset?: CustomReset;
}

export type StorageKey = keyof LocalData;

const STORAGE_KEYS = ['settings', 'history', 'panicPlan', 'customReset'] as const satisfies readonly StorageKey[];
/**
 * Keys older versions wrote that nothing reads any more. Left as they are on the
 * device (no startup migration touches stored data); only clearAll() removes them.
 * 'unlocked': the one-time purchase flag from before Anchor became free.
 */
const RETIRED_KEYS = ['unlocked'] as const;
const PREFIX = 'anchor:v1:';
/** Oldest entries are dropped beyond this, so storage can't grow forever. */
export const MAX_HISTORY = 500;

/** Calm defaults: haptics on, sound off (no sound by default), normal text. */
export const DEFAULT_SETTINGS: Readonly<Settings> = {
  haptics: true,
  sound: false,
  largeText: false,
  reducedMotion: false,
  tonePitch: 'low',
  installHintDismissed: false,
  breathPattern: '4-2-6',
  crisisRegion: 'auto',
  language: 'auto',
};

// ─── Validation: stored data may be old, partial or corrupt ──────────────────

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const HELPED: readonly Helped[] = ['breathing', 'grounding', 'both', 'not-sure'];
const isHelped = (v: unknown): v is Helped => HELPED.some((h) => h === v);
const CRISIS_CHOICES: readonly CrisisChoice[] = ['auto', 'us', 'ca', 'uk-ie', 'au', 'other'];
const isCrisisChoice = (v: unknown): v is CrisisChoice => CRISIS_CHOICES.some((c) => c === v);

export function normalizeSettings(raw: unknown): Settings {
  const r = isRecord(raw) ? raw : {};
  const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);
  return {
    haptics: bool(r.haptics, DEFAULT_SETTINGS.haptics),
    sound: bool(r.sound, DEFAULT_SETTINGS.sound),
    largeText: bool(r.largeText, DEFAULT_SETTINGS.largeText),
    reducedMotion: bool(r.reducedMotion, DEFAULT_SETTINGS.reducedMotion),
    tonePitch: r.tonePitch === 'low' || r.tonePitch === 'mid' ? r.tonePitch : DEFAULT_SETTINGS.tonePitch,
    installHintDismissed: bool(r.installHintDismissed, DEFAULT_SETTINGS.installHintDismissed),
    breathPattern:
      typeof r.breathPattern === 'string' && /^[a-z0-9-]{1,40}$/.test(r.breathPattern)
        ? r.breathPattern
        : DEFAULT_SETTINGS.breathPattern,
    crisisRegion: isCrisisChoice(r.crisisRegion) ? r.crisisRegion : DEFAULT_SETTINGS.crisisRegion,
    language: r.language === 'en' || r.language === 'es' || r.language === 'auto' ? r.language : DEFAULT_SETTINGS.language,
  };
}

/** Keeps only well-formed entries. */
export function normalizeHistory(raw: unknown): HistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  const entries: HistoryEntry[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const { at, protocolId, protocolName, completed, helped } = item;
    if (typeof at !== 'string' || typeof protocolId !== 'string' || typeof completed !== 'boolean') continue;
    entries.push({
      at,
      protocolId,
      ...(typeof protocolName === 'string' && protocolName ? { protocolName: protocolName.slice(0, CUSTOM_NAME_MAX) } : {}),
      completed,
      ...(isHelped(helped) ? { helped } : {}),
    });
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

const CUSTOM_STEPS: readonly CustomStep[] = ['breathing', 'grounding', 'lines'];
const isCustomStep = (v: unknown): v is CustomStep => CUSTOM_STEPS.some((s) => s === v);

/** A usable custom reset, or undefined if the stored value isn't one. */
export function normalizeCustomReset(raw: unknown): CustomReset | undefined {
  if (!isRecord(raw)) return undefined;
  const { name, steps, patternId, breathSec, linesLength } = raw;
  if (!Array.isArray(steps) || !steps.every(isCustomStep)) return undefined;
  if (new Set(steps).size !== steps.length || !steps.includes('breathing')) return undefined;
  if (typeof patternId !== 'string' || !/^[a-z0-9-]{1,40}$/.test(patternId)) return undefined;
  if (breathSec !== 30 && breathSec !== 60 && breathSec !== 90) return undefined;
  if (linesLength !== 'short' && linesLength !== 'standard') return undefined;
  const clean = typeof name === 'string' ? name.trim().slice(0, CUSTOM_NAME_MAX) : '';
  return { name: clean || 'My reset', steps: [...steps], patternId, breathSec, linesLength };
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
  /**
   * Records "what helped" on the completed run saved at `at`. Resolves false if
   * there is no such completed run (aborted runs never get `helped`) or the write failed.
   */
  setHistoryHelped(at: string, helped: Helped): Promise<boolean>;
  clearHistory(): Promise<void>;

  getPanicPlan(): Promise<PanicPlan | undefined>;
  savePanicPlan(plan: PanicPlan): Promise<boolean>;

  getCustomReset(): Promise<CustomReset | undefined>;
  saveCustomReset(custom: CustomReset): Promise<boolean>;
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

  // History changes are read-modify-write: run them one at a time so a quick
  // "what helped" tap can never race the entry it updates.
  let historyQueue: Promise<unknown> = Promise.resolve();
  const inHistoryQueue = <T>(task: () => Promise<T>): Promise<T> => {
    const run = historyQueue.then(task, task);
    historyQueue = run.catch(() => undefined);
    return run;
  };

  return {
    getJSON,
    setJSON,
    remove,
    async clearAll() {
      for (const key of STORAGE_KEYS) await remove(key);
      for (const key of RETIRED_KEYS) {
        try {
          await backend.removeItem(PREFIX + key);
        } catch {
          /* ignore */
        }
      }
    },

    getSettings: async () => normalizeSettings(await getJSON('settings')),
    saveSettings: (settings) => setJSON('settings', settings),

    getHistory,
    addHistoryEntry: (entry) =>
      inHistoryQueue(async () => {
        const history = await getHistory();
        return setJSON('history', [...history, entry].slice(-MAX_HISTORY));
      }),
    setHistoryHelped: (at, helped) =>
      inHistoryQueue(async () => {
        const history = await getHistory();
        for (let i = history.length - 1; i >= 0; i--) {
          const entry = history[i];
          if (entry?.at !== at) continue;
          if (!entry.completed) return false;
          history[i] = { ...entry, helped };
          return setJSON('history', history);
        }
        return false;
      }),
    clearHistory: () => inHistoryQueue(() => remove('history')),

    getPanicPlan: async () => normalizePanicPlan(await getJSON('panicPlan')),
    savePanicPlan: (plan) => setJSON('panicPlan', plan),

    getCustomReset: async () => normalizeCustomReset(await getJSON('customReset')),
    saveCustomReset: (custom) => setJSON('customReset', custom),
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
