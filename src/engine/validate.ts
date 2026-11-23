import type { Phase, Protocol } from './types';

const isPositive = (n: number): boolean => Number.isFinite(n) && n > 0;
const isNonNegative = (n: number): boolean => Number.isFinite(n) && n >= 0;
const isBlank = (s: string): boolean => s.trim() === '';
const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validatePhase(phase: Phase, at: string): string[] {
  const errors: string[] = [];
  switch (phase.kind) {
    case 'breathing':
      if (!Number.isInteger(phase.cycles) || phase.cycles < 1) errors.push(`${at}: cycles must be an integer ≥ 1`);
      if (!isPositive(phase.inhaleSec)) errors.push(`${at}: inhaleSec must be > 0`);
      if (phase.topUpSec !== undefined && !isNonNegative(phase.topUpSec)) errors.push(`${at}: topUpSec must be ≥ 0`);
      if (!isNonNegative(phase.holdSec)) errors.push(`${at}: holdSec must be ≥ 0`);
      if (!isPositive(phase.exhaleSec)) errors.push(`${at}: exhaleSec must be > 0`);
      if (phase.holdOutSec !== undefined && !isNonNegative(phase.holdOutSec)) {
        errors.push(`${at}: holdOutSec must be ≥ 0`);
      }
      break;
    case 'grounding':
      if (phase.steps.length === 0) errors.push(`${at}: grounding needs at least one step`);
      if (!isPositive(phase.secPerStep)) errors.push(`${at}: secPerStep must be > 0`);
      phase.steps.forEach((step, i) => {
        if (!Number.isInteger(step.count) || step.count < 1) errors.push(`${at}.steps[${i}]: count must be an integer ≥ 1`);
        if (isBlank(step.prompt)) errors.push(`${at}.steps[${i}]: prompt is empty`);
      });
      break;
    case 'lines':
      if (phase.lines.length === 0) errors.push(`${at}: lines phase needs at least one line`);
      if (phase.lines.some(isBlank)) errors.push(`${at}: lines must not be empty`);
      if (!isPositive(phase.secPerLine)) errors.push(`${at}: secPerLine must be > 0`);
      break;
  }
  return errors;
}

/** Structural checks. Returns human-readable problems; an empty list means valid. */
export function validateProtocol(protocol: Protocol): string[] {
  const errors: string[] = [];
  if (!KEBAB_CASE.test(protocol.id)) errors.push(`id "${protocol.id}" must be kebab-case`);
  if (isBlank(protocol.name)) errors.push('name is empty');
  if (isBlank(protocol.description)) errors.push('description is empty');
  if (!isPositive(protocol.approxSeconds)) errors.push('approxSeconds must be > 0');
  if (protocol.phases.length === 0) errors.push('protocol needs at least one phase');
  protocol.phases.forEach((phase, i) => errors.push(...validatePhase(phase, `phases[${i}]`)));
  return errors;
}
