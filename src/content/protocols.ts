import type { BreathingPhase, GroundingPhase, GroundingStep, LinesPhase, Protocol } from '../engine';
import { getBreathPattern, type BreathTiming } from './breathPatterns';
import { en } from './strings';

/**
 * All bundled protocols. Content is data: adding a protocol means adding an
 * entry here, never changing engine code.
 *
 * Copy rules (CLAUDE.md rule 7, enforced by protocols.test.ts):
 *   - every line / prompt ≤ 8 words — the person reading it is mid-panic
 *   - wellness language only: no diagnosis, treatment or medical claims
 *   - `id`s are stored in on-device history: never rename one
 */

// ─── Shared building blocks ──────────────────────────────────────────────────

/** Default pattern (see breathPatterns.ts): in 4, hold 2, out 6. 12s per cycle. */
const BREATH_4_2_6 = getBreathPattern('4-2-6').timing;

const breathing = (cycles: number, pattern: BreathTiming = BREATH_4_2_6): BreathingPhase => ({
  kind: 'breathing',
  cycles,
  ...pattern,
});

const STEPS_54321: readonly GroundingStep[] = [
  { sense: 'see', count: 5, prompt: en.grounding.see },
  { sense: 'touch', count: 4, prompt: en.grounding.touch },
  { sense: 'hear', count: 3, prompt: en.grounding.hear },
  { sense: 'smell', count: 2, prompt: en.grounding.smell },
  { sense: 'taste', count: 1, prompt: en.grounding.taste },
];

const grounding = (secPerStep: number): GroundingPhase => ({ kind: 'grounding', steps: STEPS_54321, secPerStep });

const lines = (secPerLine: number, ...text: string[]): LinesPhase => ({ kind: 'lines', lines: text, secPerLine });

// ─── Core ───────────────────────────────────────────────────────────────

/** 4×12s breathing (48s) + 5×6s grounding (30s) + 3×5s lines (15s) = 93s. */
export const classic90 = {
  id: 'classic-90',
  name: en.protocols['classic-90'].name,
  description: en.protocols['classic-90'].description,
  approxSeconds: 90,
  phases: [
    breathing(4),
    grounding(6),
    lines(5, en.calm.passes, en.calm.safe, en.calm.circle),
  ],
} as const satisfies Protocol;

/** 5×12s = 60s. */
export const breathing60 = {
  id: 'breathing-60',
  name: en.protocols['breathing-60'].name,
  description: en.protocols['breathing-60'].description,
  approxSeconds: 60,
  phases: [breathing(5)],
  // Library opens the pattern picker first; the step stays ~60s whichever pattern is picked.
  choosePattern: true,
} as const satisfies Protocol;

/** 5×6s grounding (30s) + 2×5s lines (10s) = 40s. */
export const groundingOnly = {
  id: 'grounding-only',
  name: en.protocols['grounding-only'].name,
  description: en.protocols['grounding-only'].description,
  approxSeconds: 40,
  phases: [grounding(6), lines(5, en.calm.passes, en.calm.safe)],
} as const satisfies Protocol;

// ─── More ways ────────────────────────────────────────────────────────────────

/** 4×16s = 64s. */
export const boxBreathing = {
  id: 'box-breathing',
  name: en.protocols['box-breathing'].name,
  description: en.protocols['box-breathing'].description,
  approxSeconds: 65,
  phases: [breathing(4, getBreathPattern('box').timing)],
} as const satisfies Protocol;

/** 6×12s breathing (72s) + 5×12s grounding (60s) + 6×8s lines (48s) = 180s. */
export const extended3min = {
  id: 'extended-3min',
  name: en.protocols['extended-3min'].name,
  description: en.protocols['extended-3min'].description,
  approxSeconds: 180,
  phases: [
    breathing(6),
    grounding(12),
    lines(
      8,
      en.calm.passes,
      en.calm.safe,
      en.calm.slower,
      en.calm.nothing,
      en.calm.body,
      en.calm.circle,
    ),
  ],
} as const satisfies Protocol;

/** 4×14s = 56s. Longer exhale, silent, extra-dim for the middle of the night. */
export const nightProtocol = {
  id: 'night-protocol',
  name: en.protocols['night-protocol'].name,
  description: en.protocols['night-protocol'].description,
  approxSeconds: 55,
  noTones: true,
  extraDim: true,
  phases: [breathing(4, { inhaleSec: 4, holdSec: 2, exhaleSec: 8 })],
} as const satisfies Protocol;

// ─── Typed list ──────────────────────────────────────────────────────────────

/** Library order (all free): the three core resets, then box, extended and night. */
export const protocols = [classic90, breathing60, groundingOnly, boxBreathing, extended3min, nightProtocol] as const;

export type ProtocolId = (typeof protocols)[number]['id'];

/** What "Start reset" on Home runs. */
export const DEFAULT_PROTOCOL_ID: ProtocolId = 'classic-90';

const byId: ReadonlyMap<string, Protocol> = new Map(protocols.map((p) => [p.id, p]));

/** Look up a protocol by id — e.g. one read back from on-device history. */
export function getProtocol(id: string): Protocol | undefined {
  return byId.get(id);
}

export function isProtocolId(id: string): id is ProtocolId {
  return byId.has(id);
}

/** The protocol "Start reset" on Home runs. */
export const defaultProtocol: Protocol = classic90;
