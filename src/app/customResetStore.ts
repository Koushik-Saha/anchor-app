import { CUSTOM_RESET_ID, customProtocol, DEFAULT_CUSTOM_NAME } from '../content/customReset';
import { getProtocol } from '../content/protocols';
import type { Protocol } from '../engine';
import { CUSTOM_NAME_MAX, storage, type CustomReset } from '../platform/storage';

/** In-memory copy, loaded before the first render so Library and Reset can read it directly. */
let cached: CustomReset | undefined;

export async function loadCustomReset(): Promise<void> {
  cached = await storage.getCustomReset();
}

export function getCachedCustomReset(): CustomReset | undefined {
  return cached;
}

export async function saveCustomReset(custom: CustomReset): Promise<boolean> {
  const clean = { ...custom, name: custom.name.trim().slice(0, CUSTOM_NAME_MAX) || DEFAULT_CUSTOM_NAME };
  const saved = await storage.saveCustomReset(clean);
  if (saved) cached = clean;
  return saved;
}

export async function deleteCustomReset(): Promise<void> {
  cached = undefined;
  await storage.remove('customReset');
}

/** A built-in by id, or the saved custom reset. */
export function resolveProtocol(id: string): Protocol | undefined {
  if (id !== CUSTOM_RESET_ID) return getProtocol(id);
  return cached ? customProtocol(cached) : undefined;
}
