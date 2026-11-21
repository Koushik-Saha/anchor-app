/**
 * Protocol content model (spec §2.4). Protocols are content-as-data: a new
 * protocol is new data in src/content, never new engine code.
 */

export interface BreathingPhase {
  kind: 'breathing';
  cycles: number;
  inhaleSec: number;
  /** Hold after inhaling; 0 for no hold. */
  holdSec: number;
  exhaleSec: number;
  /** Hold after exhaling (box breathing); omitted/0 for no hold. */
  holdOutSec?: number;
}

export type GroundingSense = 'see' | 'touch' | 'hear' | 'smell' | 'taste';

export interface GroundingStep {
  sense: GroundingSense;
  count: number;
  /** One short line shown during the step (≤ 8 words). */
  prompt: string;
}

export interface GroundingPhase {
  kind: 'grounding';
  steps: readonly GroundingStep[];
  /** How long each step is shown before advancing. */
  secPerStep: number;
}

export interface LinesPhase {
  kind: 'lines';
  /** Short reassurance lines (≤ 8 words each), shown one at a time. */
  lines: readonly string[];
  secPerLine: number;
}

export type Phase = BreathingPhase | GroundingPhase | LinesPhase;

export interface Protocol {
  /** Stable kebab-case identifier, e.g. "classic-90". Stored in on-device history — never rename. */
  id: string;
  name: string;
  /** One line for the library card. */
  description: string;
  /** Free core protocols are `false`; `true` requires the one-time unlock. */
  locked: boolean;
  /** Rounded duration shown to the user. Must stay within 10% of the real total (tested). */
  approxSeconds: number;
  phases: readonly Phase[];
  /** Never play tones, even if sound is on. */
  noTones?: boolean;
  /** Render the reset flow extra-dim (night use). */
  extraDim?: boolean;
}
