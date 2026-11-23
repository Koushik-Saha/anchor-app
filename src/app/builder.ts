import { DEFAULT_CUSTOM_NAME } from '../content/customReset';
import type { CustomReset, CustomStep } from '../platform/storage';

/** The builder's screens, one decision each. */
export type BuilderStage = 'steps' | 'pattern' | 'breath-length' | 'lines-length' | 'name';

export const NEW_CUSTOM_RESET: CustomReset = {
  name: DEFAULT_CUSTOM_NAME,
  steps: [],
  patternId: '4-2-6',
  breathSec: 60,
  linesLength: 'standard',
};

/** Tap to add at the end of the order; tap again to take it out. */
export function toggleStep(steps: readonly CustomStep[], step: CustomStep): CustomStep[] {
  return steps.includes(step) ? steps.filter((s) => s !== step) : [...steps, step];
}

export const canLeaveSteps = (steps: readonly CustomStep[]): boolean => steps.includes('breathing');

export function stagesFor(steps: readonly CustomStep[]): BuilderStage[] {
  return ['steps', 'pattern', 'breath-length', ...(steps.includes('lines') ? (['lines-length'] as const) : []), 'name'];
}

export function nextStage(stage: BuilderStage, steps: readonly CustomStep[]): BuilderStage {
  const stages = stagesFor(steps);
  return stages[stages.indexOf(stage) + 1] ?? stage;
}

/** null on the first screen. */
export function previousStage(stage: BuilderStage, steps: readonly CustomStep[]): BuilderStage | null {
  const stages = stagesFor(steps);
  return stages[stages.indexOf(stage) - 1] ?? null;
}
