import { useSyncExternalStore } from 'react';
import * as purchases from '../platform/purchases';
import { storage } from '../platform/storage';

/**
 * App-wide "is the one-time unlock owned?" state. Persisted with the storage
 * adapter; granted by a purchase, a restore, or a silent store check. Never
 * revoked automatically — an offline or flaky store must not take features away.
 */
let unlocked = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** Load the saved flag and listen for late store confirmations. Call once at startup. */
export async function initUnlock(): Promise<void> {
  unlocked = await storage.isUnlocked();
  notify();
  purchases.onUnlockGranted(() => void grantUnlock());
}

export async function grantUnlock(): Promise<void> {
  await storage.setUnlocked(true);
  unlocked = true;
  notify();
}

/** Silent store check (no prompts) — picks up a purchase made on another install of the same account. */
export async function syncUnlockWithStore(): Promise<void> {
  if (unlocked || !purchases.isAvailable()) return;
  if (await purchases.ownsUnlock()) await grantUnlock();
}

export function isUnlocked(): boolean {
  return unlocked;
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

export function useUnlocked(): boolean {
  return useSyncExternalStore(subscribe, isUnlocked, isUnlocked);
}
