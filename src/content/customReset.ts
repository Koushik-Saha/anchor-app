import { breathingCycleSec, protocolDurationSec, type Phase, type Protocol } from '../engine';
import type { CustomReset, CustomStep } from '../platform/storage';
import { getBreathPattern } from './breathPatterns';
import { classic90, groundingOnly } from './protocols';

/**
 * The person's one custom reset, as ordinary protocol data: it plays through the same
 * Reset screen and engine as every built-in, and reuses their grounding and calm lines.
 */

/** Stored in on-device history: never rename. */
export const CUSTOM_RESET_ID = 'custom-reset';
export const DEFAULT_CUSTOM_NAME = 'My reset';

export const CUSTOM_STEPS: readonly { value: CustomStep; label: string }[] = [
  { value: 'breathing', label: 'Breathing' },
  { value: 'grounding', label: 'Grounding' },
  { value: 'lines', label: 'Calm lines' },
];

const stepLabel = (step: CustomStep) => CUSTOM_STEPS.find((s) => s.value === step)?.label ?? step;

function phaseFor(step: CustomStep, custom: CustomReset): Phase {
  const [grounding, shortLines] = groundingOnly.phases;
  const standardLines = classic90.phases[2];
  switch (step) {
    case 'breathing': {
      const { timing } = getBreathPattern(custom.patternId);
      // Whole breaths only, as near to the chosen length as they allow.
      const cycles = Math.max(1, Math.round(custom.breathSec / breathingCycleSec(timing)));
      return { kind: 'breathing', cycles, ...timing };
    }
    case 'grounding':
      return grounding;
    case 'lines':
      return custom.linesLength === 'short' ? shortLines : standardLines;
  }
}

export function customProtocol(custom: CustomReset): Protocol {
  const phases = custom.steps.map((step) => phaseFor(step, custom));
  return {
    id: CUSTOM_RESET_ID,
    name: custom.name,
    description: custom.steps.map(stepLabel).join(', '),
    approxSeconds: protocolDurationSec({ phases }),
    phases,
  };
}
