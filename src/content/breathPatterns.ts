import { breathingCycleSec, phaseDurationSec, type BreathingPhase, type Protocol } from '../engine';
import { en } from './strings';

/**
 * Breathing patterns as data. Each one is just timing for a BreathingPhase, so the
 * circle, haptics, tones, reduced motion and keep-awake behave exactly as they do for
 * the default 4-2-6 and box breathing. A new pattern = a new entry here.
 *
 * Copy rules (CLAUDE.md): `name` and `line` are each ≤ 8 words (tested), describe what to
 * do, never what it does to the body. `id`s are stored on-device: never rename one.
 */

export type BreathTiming = Omit<BreathingPhase, 'kind' | 'cycles'>;

export interface BreathPattern {
  id: string;
  name: string;
  /** The one short line on the picker button. */
  line: string;
  timing: BreathTiming;
}

export const BREATH_PATTERNS = [
  {
    id: '4-2-6',
    name: en.patterns['4-2-6'].name,
    line: en.patterns['4-2-6'].line,
    timing: { inhaleSec: 4, holdSec: 2, exhaleSec: 6 }, // 12s
  },
  {
    id: 'box',
    name: en.patterns['box'].name,
    line: en.patterns['box'].line,
    timing: { inhaleSec: 4, holdSec: 4, exhaleSec: 4, holdOutSec: 4 }, // 16s
  },
  {
    id: '4-7-8',
    name: en.patterns['4-7-8'].name,
    line: en.patterns['4-7-8'].line,
    timing: { inhaleSec: 4, holdSec: 7, exhaleSec: 8 }, // 19s
  },
  {
    id: 'double-inhale',
    name: en.patterns['double-inhale'].name,
    line: en.patterns['double-inhale'].line,
    timing: { inhaleSec: 3, topUpSec: 1, holdSec: 0, exhaleSec: 6 }, // 10s
  },
] as const satisfies readonly BreathPattern[];

export type BreathPatternId = (typeof BREATH_PATTERNS)[number]['id'];

/** The classic reset's pattern, and the picker's choice until the person picks another. */
export const DEFAULT_BREATH_PATTERN_ID: BreathPatternId = '4-2-6';

const byId: ReadonlyMap<string, BreathPattern> = new Map(BREATH_PATTERNS.map((p) => [p.id, p]));

export function isBreathPatternId(id: unknown): id is BreathPatternId {
  return typeof id === 'string' && byId.has(id);
}

/** Looks up a stored id; anything unknown (old, corrupt) falls back to the default. */
export function getBreathPattern(id: unknown): BreathPattern {
  return (isBreathPatternId(id) ? byId.get(id) : undefined) ?? BREATH_PATTERNS[0];
}

/**
 * The same protocol with every breathing phase switched to `pattern`. Each breathing
 * step keeps (as near as whole breaths allow) its original length: cycles are recounted.
 */
export function withBreathPattern(protocol: Protocol, pattern: BreathPattern): Protocol {
  return {
    ...protocol,
    phases: protocol.phases.map((phase) => {
      if (phase.kind !== 'breathing') return phase;
      const lengthSec = phaseDurationSec(phase);
      const cycles = Math.max(1, Math.round(lengthSec / breathingCycleSec(pattern.timing)));
      return { kind: 'breathing', cycles, ...pattern.timing };
    }),
  };
}

/**
 * What the Reset screen actually runs: protocols that let the person choose
 * (`choosePattern`) use their last-picked pattern; every other protocol runs as written
 * (the classic reset always breathes 4-2-6).
 */
export function protocolWithChosenPattern(protocol: Protocol, patternId: unknown): Protocol {
  return protocol.choosePattern ? withBreathPattern(protocol, getBreathPattern(patternId)) : protocol;
}
