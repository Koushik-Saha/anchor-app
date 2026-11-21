/**
 * Haptics adapter (CLAUDE.md rule 4). Use as a namespace:
 *   import * as haptics from '../platform/haptics';
 *   haptics.pulse('phase');
 *
 * Web: navigator.vibrate (Android browsers). iOS Safari and desktop browsers
 * without a vibration motor are a silent no-op. Native (Phase 3): implement
 * HapticsAdapter with @capacitor/haptics and pass it to setAdapter() at startup.
 *
 * pulse() never throws and never returns a rejected promise.
 */

export type HapticPattern = 'phase' | 'tap' | 'done';

export interface HapticsAdapter {
  /** False when the device/browser has no way to vibrate. */
  readonly supported: boolean;
  pulse(pattern: HapticPattern): Promise<void>;
}

/** Vibration timings in ms ([on, off, on, …]). Short and soft — this is for calming, not alerting. */
export const WEB_PATTERNS: Readonly<Record<HapticPattern, number | readonly number[]>> = {
  tap: 12,
  phase: 35,
  done: [40, 90, 40],
};

type Vibrate = (pattern: number | number[]) => boolean;

function browserVibrate(): Vibrate | undefined {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return undefined;
  return (pattern) => navigator.vibrate(pattern);
}

export function createWebHaptics(vibrate: Vibrate | undefined = browserVibrate()): HapticsAdapter {
  return {
    supported: vibrate !== undefined,
    async pulse(pattern) {
      if (!vibrate) return;
      const timing = WEB_PATTERNS[pattern];
      vibrate(typeof timing === 'number' ? timing : [...timing]);
    },
  };
}

// ─── Module API (what call sites use) ────────────────────────────────────────

let adapter: HapticsAdapter = createWebHaptics();
let enabled = true; // mirrors settings.haptics (default on); synced by SettingsProvider

export function setAdapter(next: HapticsAdapter): void {
  adapter = next;
}

export function isSupported(): boolean {
  return adapter.supported;
}

export function isEnabled(): boolean {
  return enabled;
}

export function setEnabled(on: boolean): void {
  enabled = on;
}

/** Fire-and-forget. No-op when disabled or unsupported. Never throws. */
export function pulse(pattern: HapticPattern): void {
  if (!enabled) return;
  try {
    adapter.pulse(pattern).catch(() => undefined);
  } catch {
    /* adapter threw synchronously: ignore */
  }
}
