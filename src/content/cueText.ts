import type { BreathPart, Cue } from '../engine';
import { en } from './strings';

/** On-screen words for each breath part (≤ 8 words — see protocols.test.ts). */
export const BREATH_LABELS: Readonly<Record<BreathPart, string>> = en.breath;

/** The single line of text the Reset screen shows for a cue. */
export function cueText(cue: Cue, labels: Readonly<Record<BreathPart, string>> = BREATH_LABELS): string {
  switch (cue.kind) {
    case 'breathing':
      return labels[cue.part];
    case 'grounding':
      return cue.step.prompt;
    case 'lines':
      return cue.line;
  }
}
