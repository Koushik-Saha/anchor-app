/**
 * Wake-lock adapter (CLAUDE.md rule 4): keeps the screen on during a reset.
 * Use as a namespace:
 *   import * as wakeLock from '../platform/wakeLock';
 *   await wakeLock.acquire(); … await wakeLock.release();
 *
 * Web: Screen Wake Lock API (secure contexts only — https or localhost).
 * Browsers drop the lock whenever the page is hidden, so it is re-acquired on
 * visibilitychange while still wanted. No-op where unsupported.
 * Native (Phase 3): implement WakeLockAdapter with a keep-awake plugin and
 * pass it to setAdapter() at startup.
 *
 * Nothing here ever throws or rejects.
 */

export interface WakeLockAdapter {
  readonly supported: boolean;
  acquire(): Promise<void>;
  release(): Promise<void>;
  isHeld(): boolean;
}

/** The minimal slices of the browser APIs we use (lets tests pass fakes). */
interface LockHandle {
  release(): Promise<void>;
  addEventListener(type: 'release', listener: () => void): void;
}
interface WakeLockApi {
  request(type: 'screen'): Promise<LockHandle>;
}
interface VisibilityDoc {
  readonly visibilityState: DocumentVisibilityState;
  addEventListener(type: 'visibilitychange', listener: () => void): void;
  removeEventListener(type: 'visibilitychange', listener: () => void): void;
}
export interface WakeLockEnv {
  wakeLock?: WakeLockApi;
  document?: VisibilityDoc;
}

function browserEnv(): WakeLockEnv {
  return {
    wakeLock: typeof navigator !== 'undefined' && 'wakeLock' in navigator ? navigator.wakeLock : undefined,
    document: typeof document === 'undefined' ? undefined : document,
  };
}

export function createWebWakeLock(env: WakeLockEnv = browserEnv()): WakeLockAdapter {
  const { wakeLock: api, document: doc } = env;
  let lock: LockHandle | null = null;
  let wanted = false;
  let pending: Promise<void> | null = null;

  const request = async (): Promise<void> => {
    if (!api || doc?.visibilityState !== 'visible') return;
    try {
      const handle = await api.request('screen');
      if (!wanted) {
        await handle.release(); // released while the request was in flight
        return;
      }
      lock = handle;
      handle.addEventListener('release', () => {
        if (lock === handle) lock = null;
      });
    } catch {
      lock = null; // denied (e.g. battery saver): no-op
    }
  };

  // Single-flight, so overlapping acquire()/visibility events never leak a second lock.
  const ensureLock = (): Promise<void> => {
    if (lock) return Promise.resolve();
    pending ??= request().finally(() => {
      pending = null;
    });
    return pending;
  };

  const onVisibilityChange = (): void => {
    if (wanted && doc?.visibilityState === 'visible') void ensureLock();
  };

  return {
    supported: api !== undefined && doc !== undefined,
    isHeld: () => lock !== null,

    async acquire() {
      if (!api || !doc) return;
      if (!wanted) {
        wanted = true;
        doc.addEventListener('visibilitychange', onVisibilityChange);
      }
      await ensureLock();
    },

    async release() {
      if (wanted) doc?.removeEventListener('visibilitychange', onVisibilityChange);
      wanted = false;
      const handle = lock;
      lock = null;
      if (!handle) return;
      try {
        await handle.release();
      } catch {
        /* already released */
      }
    },
  };
}

// ─── Module API (what call sites use) ────────────────────────────────────────

let adapter: WakeLockAdapter = createWebWakeLock();

export function setAdapter(next: WakeLockAdapter): void {
  adapter = next;
}

export function isSupported(): boolean {
  return adapter.supported;
}

export function isHeld(): boolean {
  try {
    return adapter.isHeld();
  } catch {
    return false;
  }
}

export async function acquire(): Promise<void> {
  try {
    await adapter.acquire();
  } catch {
    /* ignore */
  }
}

export async function release(): Promise<void> {
  try {
    await adapter.release();
  } catch {
    /* ignore */
  }
}
