import { describe, expect, it, vi } from 'vitest';
import * as wakeLock from './wakeLock';
import { createWebWakeLock, type WakeLockEnv } from './wakeLock';

/** Fake browser: a document with controllable visibility and a wake-lock API that tracks locks. */
function fakeEnv() {
  const listeners = new Set<() => void>();
  let visibility: DocumentVisibilityState = 'visible';
  const active: { onRelease?: () => void; released: boolean }[] = [];

  const doc = {
    get visibilityState() {
      return visibility;
    },
    addEventListener: (_: 'visibilitychange', l: () => void) => void listeners.add(l),
    removeEventListener: (_: 'visibilitychange', l: () => void) => void listeners.delete(l),
  };

  const api = {
    request: vi.fn(async () => {
      const lock: { onRelease?: () => void; released: boolean } = { released: false };
      active.push(lock);
      return {
        release: async () => {
          lock.released = true;
        },
        addEventListener: (_: 'release', l: () => void) => {
          lock.onRelease = l;
        },
      };
    }),
  };

  const setVisibility = (v: DocumentVisibilityState) => {
    visibility = v;
    if (v === 'hidden') {
      // Browsers release screen locks when the page is hidden.
      for (const lock of active.filter((l) => !l.released)) {
        lock.released = true;
        lock.onRelease?.();
      }
    }
    listeners.forEach((l) => l());
  };

  const env: WakeLockEnv = { wakeLock: api, document: doc };
  return { env, api, active, listeners, setVisibility };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('createWebWakeLock', () => {
  it('acquires and releases', async () => {
    const { env, active, listeners } = fakeEnv();
    const lock = createWebWakeLock(env);
    expect(lock.supported).toBe(true);

    await lock.acquire();
    expect(lock.isHeld()).toBe(true);
    expect(listeners.size).toBe(1);

    await lock.release();
    expect(lock.isHeld()).toBe(false);
    expect(active[0]?.released).toBe(true);
    expect(listeners.size).toBe(0);
  });

  it('re-acquires when the page becomes visible again', async () => {
    const { env, api, setVisibility } = fakeEnv();
    const lock = createWebWakeLock(env);
    await lock.acquire();

    setVisibility('hidden');
    expect(lock.isHeld()).toBe(false);

    setVisibility('visible');
    await flush();
    expect(lock.isHeld()).toBe(true);
    expect(api.request).toHaveBeenCalledTimes(2);
  });

  it('does not re-acquire after release', async () => {
    const { env, api, setVisibility } = fakeEnv();
    const lock = createWebWakeLock(env);
    await lock.acquire();
    await lock.release();
    setVisibility('hidden');
    setVisibility('visible');
    await flush();
    expect(api.request).toHaveBeenCalledTimes(1);
    expect(lock.isHeld()).toBe(false);
  });

  it('never holds two locks when acquire() is called concurrently', async () => {
    const { env, api } = fakeEnv();
    const lock = createWebWakeLock(env);
    await Promise.all([lock.acquire(), lock.acquire(), lock.acquire()]);
    expect(api.request).toHaveBeenCalledTimes(1);
  });

  it('releases a lock that arrives after release() was called', async () => {
    const { env, active } = fakeEnv();
    const lock = createWebWakeLock(env);
    const pending = lock.acquire();
    await lock.release();
    await pending;
    expect(lock.isHeld()).toBe(false);
    expect(active[0]?.released).toBe(true);
  });

  it('waits for visibility before requesting', async () => {
    const { env, api, setVisibility } = fakeEnv();
    setVisibility('hidden');
    const lock = createWebWakeLock(env);
    await lock.acquire();
    expect(api.request).not.toHaveBeenCalled();
    setVisibility('visible');
    await flush();
    expect(lock.isHeld()).toBe(true);
  });

  it('swallows a denied request', async () => {
    const { env } = fakeEnv();
    const lock = createWebWakeLock({ ...env, wakeLock: { request: () => Promise.reject(new Error('denied')) } });
    await expect(lock.acquire()).resolves.toBeUndefined();
    expect(lock.isHeld()).toBe(false);
  });

  it('is an unsupported no-op without the API (Node, insecure context)', async () => {
    const lock = createWebWakeLock({});
    expect(lock.supported).toBe(false);
    await expect(lock.acquire()).resolves.toBeUndefined();
    await expect(lock.release()).resolves.toBeUndefined();
    expect(createWebWakeLock().supported).toBe(false);
  });
});

describe('wakeLock module', () => {
  it('never rejects even if the adapter does', async () => {
    wakeLock.setAdapter({
      supported: true,
      acquire: () => Promise.reject(new Error('x')),
      release: () => Promise.reject(new Error('x')),
      isHeld: () => {
        throw new Error('x');
      },
    });
    await expect(wakeLock.acquire()).resolves.toBeUndefined();
    await expect(wakeLock.release()).resolves.toBeUndefined();
    expect(wakeLock.isHeld()).toBe(false);
  });
});
