import type { BreathingPhase, GroundingPhase, GroundingStep, LinesPhase, Protocol } from '../engine';

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

/** Default pattern: long exhale is what down-regulates. 12s per cycle. */
const BREATH_4_2_6 = { inhaleSec: 4, holdSec: 2, exhaleSec: 6 } as const;

const breathing = (cycles: number, pattern: Omit<BreathingPhase, 'kind' | 'cycles'> = BREATH_4_2_6): BreathingPhase => ({
  kind: 'breathing',
  cycles,
  ...pattern,
});

const STEPS_54321: readonly GroundingStep[] = [
  { sense: 'see', count: 5, prompt: 'Find 5 things you can see.' },
  { sense: 'touch', count: 4, prompt: 'Notice 4 things you can touch.' },
  { sense: 'hear', count: 3, prompt: 'Listen for 3 sounds.' },
  { sense: 'smell', count: 2, prompt: 'Notice 2 things you can smell.' },
  { sense: 'taste', count: 1, prompt: 'Notice 1 thing you can taste.' },
];

const grounding = (secPerStep: number): GroundingPhase => ({ kind: 'grounding', steps: STEPS_54321, secPerStep });

const lines = (secPerLine: number, ...text: string[]): LinesPhase => ({ kind: 'lines', lines: text, secPerLine });

// ─── Core ───────────────────────────────────────────────────────────────

/** 4×12s breathing (48s) + 5×6s grounding (30s) + 3×5s lines (15s) = 93s. */
export const classic90 = {
  id: 'classic-90',
  name: 'Classic reset',
  description: 'Breathe, ground, settle. The full 90 seconds.',
  approxSeconds: 90,
  phases: [
    breathing(4),
    grounding(6),
    lines(5, 'This always passes.', 'You are safe right now.', 'Just breathe with the circle.'),
  ],
} as const satisfies Protocol;

/** 5×12s = 60s. */
export const breathing60 = {
  id: 'breathing-60',
  name: 'Just breathing',
  description: 'One minute of slow breathing with the circle.',
  approxSeconds: 60,
  phases: [breathing(5)],
} as const satisfies Protocol;

/** 5×6s grounding (30s) + 2×5s lines (10s) = 40s. */
export const groundingOnly = {
  id: 'grounding-only',
  name: 'Just grounding',
  description: '5-4-3-2-1: come back through your senses.',
  approxSeconds: 40,
  phases: [grounding(6), lines(5, 'This always passes.', 'You are safe right now.')],
} as const satisfies Protocol;

// ─── More ways ────────────────────────────────────────────────────────────────

/** 4×16s = 64s. */
export const boxBreathing = {
  id: 'box-breathing',
  name: 'Box breathing',
  description: 'In, hold, out, hold: four even counts.',
  approxSeconds: 65,
  phases: [breathing(4, { inhaleSec: 4, holdSec: 4, exhaleSec: 4, holdOutSec: 4 })],
} as const satisfies Protocol;

/** 6×12s breathing (72s) + 5×12s grounding (60s) + 6×8s lines (48s) = 180s. */
export const extended3min = {
  id: 'extended-3min',
  name: 'Extended reset',
  description: 'A slower, longer reset for when 90 seconds isn’t enough.',
  approxSeconds: 180,
  phases: [
    breathing(6),
    grounding(12),
    lines(
      8,
      'This always passes.',
      'You are safe right now.',
      'Each breath slows things down.',
      'Nothing to fix. Just breathe.',
      'Your body knows how to settle.',
      'Just breathe with the circle.',
    ),
  ],
} as const satisfies Protocol;

/** 4×14s = 56s. Longer exhale, silent, extra-dim for the middle of the night. */
export const nightProtocol = {
  id: 'night-protocol',
  name: 'Night reset',
  description: 'Extra dim and silent, with a longer exhale.',
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
