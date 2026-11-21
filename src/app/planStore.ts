import { storage, type PanicPlan } from '../platform/storage';
import { cleanPlan, isPlanEmpty } from './plan';

/**
 * In-memory copy of My plan, loaded before the first render, so the Done screen
 * shows the note and call button on its very first frame — no pop-in, no layout
 * shift (native storage reads are asynchronous).
 */
let cached: PanicPlan | undefined;

export async function loadPlan(): Promise<void> {
  cached = await storage.getPanicPlan();
}

export function getCachedPlan(): PanicPlan | undefined {
  return cached;
}

/** Saves (or removes, if empty) and keeps the cache in step. */
export async function savePlan(plan: PanicPlan): Promise<void> {
  const clean = cleanPlan(plan);
  cached = isPlanEmpty(clean) ? undefined : clean;
  if (cached) await storage.savePanicPlan(cached);
  else await storage.remove('panicPlan');
}
