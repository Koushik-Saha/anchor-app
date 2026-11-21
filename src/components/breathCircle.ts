import type { Cue } from '../engine/cue';

/** Circle scale range while breathing (fraction of full size). */
export const BREATH_MIN_SCALE = 0.5;
export const BREATH_MAX_SCALE = 1;
/** Calm mid-size during grounding / settle lines. */
export const REST_SCALE = 0.72;
/** Gentle pulse while resting: ±4% over a slow 5s cycle. */
export const PULSE_AMOUNT = 0.04;
export const PULSE_MS = 5_000;
/** How quickly the circle settles into its resting size after breathing ends. */
const SETTLE_TAU_MS = 600;
/** Fixed size used in reduced-motion mode; only opacity moves. */
const STILL_SCALE = 0.8;

export interface CircleFrame {
  scale: number;
  opacity: number;
}

/**
 * Turns cues into circle styles, frame by frame.
 * - Breathing: tracks `cue.level` exactly — no smoothing, so it follows the timing to the frame.
 * - Grounding / lines: rests at mid-size with a slow pulse, easing in from wherever breathing left it.
 * - Reduced motion: never scales; the same rhythm is shown as an opacity fade.
 */
export function createCircleAnimator() {
  let current: CircleFrame | null = null;
  let lastAt: number | null = null;

  return function frame(cue: Cue, phaseElapsedMs: number, at: number, reducedMotion: boolean): CircleFrame {
    const dt = lastAt === null ? 0 : Math.max(at - lastAt, 0);
    lastAt = at;

    let target: CircleFrame;
    let smooth = false;

    if (cue.kind === 'breathing') {
      target = reducedMotion
        ? { scale: STILL_SCALE, opacity: 0.3 + 0.7 * cue.level }
        : { scale: BREATH_MIN_SCALE + (BREATH_MAX_SCALE - BREATH_MIN_SCALE) * cue.level, opacity: 1 };
    } else {
      const pulse = (1 - Math.cos((2 * Math.PI * phaseElapsedMs) / PULSE_MS)) / 2; // 0..1, starts at 0
      target = reducedMotion
        ? { scale: STILL_SCALE, opacity: 0.55 + 0.2 * pulse }
        : { scale: REST_SCALE + PULSE_AMOUNT * pulse, opacity: 1 };
      smooth = true;
    }

    if (!smooth || current === null) {
      current = target;
    } else {
      const k = 1 - Math.exp(-dt / SETTLE_TAU_MS);
      current = {
        scale: current.scale + (target.scale - current.scale) * k,
        opacity: current.opacity + (target.opacity - current.opacity) * k,
      };
    }
    return current;
  };
}
