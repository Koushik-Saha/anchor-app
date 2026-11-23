import type { BreathPart, Cue } from '../engine';

/** On-screen words for each breath part (≤ 8 words — see protocols.test.ts). */
export const BREATH_LABELS: Readonly<Record<BreathPart, string>> = {
  inhale: 'Breathe in',
  topUp: 'A little more in',
  hold: 'Hold',
  exhale: 'Breathe out',
  holdOut: 'Hold',
};

/** The single line of text the Reset screen shows for a cue. */
export function cueText(cue: Cue): string {
  switch (cue.kind) {
    case 'breathing':
      return BREATH_LABELS[cue.part];
    case 'grounding':
      return cue.step.prompt;
    case 'lines':
      return cue.line;
  }
}
