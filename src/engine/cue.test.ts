import { describe, expect, it } from 'vitest';
import { cueAt, easeInOut } from './cue';
import type { BreathingPhase, GroundingPhase, LinesPhase } from './types';

const breath: BreathingPhase = { kind: 'breathing', cycles: 2, inhaleSec: 4, holdSec: 2, exhaleSec: 6 };
const box: BreathingPhase = { kind: 'breathing', cycles: 1, inhaleSec: 4, holdSec: 4, exhaleSec: 4, holdOutSec: 4 };

describe('easeInOut', () => {
  it('runs 0 → 0.5 → 1, clamped', () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(0.5)).toBeCloseTo(0.5);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(-1)).toBe(0);
    expect(easeInOut(2)).toBe(1);
  });
});

describe('breathing cues', () => {
  it('follows inhale → hold → exhale with the exact timing', () => {
    expect(cueAt(breath, 0)).toMatchObject({ part: 'inhale', cycle: 0, partProgress: 0, level: 0 });
    expect(cueAt(breath, 2_000)).toMatchObject({ part: 'inhale', partProgress: 0.5 });
    expect(cueAt(breath, 3_999)).toMatchObject({ part: 'inhale' });
    expect(cueAt(breath, 4_000)).toMatchObject({ part: 'hold', partProgress: 0, level: 1 });
    expect(cueAt(breath, 6_000)).toMatchObject({ part: 'exhale', partProgress: 0, level: 1 });
    expect(cueAt(breath, 9_000)).toMatchObject({ part: 'exhale', partProgress: 0.5 });
    expect(cueAt(breath, 12_000)).toMatchObject({ part: 'inhale', cycle: 1, level: 0 });
  });

  it('level grows on inhale, stays full on hold, shrinks on exhale', () => {
    const levels = [0, 1_000, 2_000, 3_000, 4_000, 5_000, 6_000, 8_000, 10_000, 11_999].map(
      (t) => (cueAt(breath, t) as { level: number }).level,
    );
    expect(levels.slice(0, 5)).toEqual([...levels.slice(0, 5)].sort((a, b) => a - b)); // rising
    expect(levels[4]).toBe(1);
    expect(levels[5]).toBe(1);
    expect(levels.slice(6)).toEqual([...levels.slice(6)].sort((a, b) => b - a)); // falling
    expect(levels.at(-1)).toBeLessThan(0.01);
  });

  it('supports a hold after exhaling (box breathing) at level 0', () => {
    expect(cueAt(box, 12_000)).toMatchObject({ part: 'holdOut', level: 0 });
    expect(cueAt(box, 15_999)).toMatchObject({ part: 'holdOut' });
  });

  it('skips zero-length holds', () => {
    const noHold: BreathingPhase = { ...breath, holdSec: 0 };
    expect(cueAt(noHold, 4_000)).toMatchObject({ part: 'exhale' });
  });

  it('clamps outside the phase: end of last exhale, start of first inhale', () => {
    expect(cueAt(breath, 24_000)).toMatchObject({ cycle: 1, part: 'exhale', partProgress: 1, level: 0 });
    expect(cueAt(breath, 99_999)).toMatchObject({ cycle: 1, part: 'exhale' });
    expect(cueAt(breath, -5)).toMatchObject({ cycle: 0, part: 'inhale', level: 0 });
  });
});

describe('grounding and lines cues', () => {
  const grounding: GroundingPhase = {
    kind: 'grounding',
    secPerStep: 6,
    steps: [
      { sense: 'see', count: 5, prompt: 'See' },
      { sense: 'touch', count: 4, prompt: 'Touch' },
    ],
  };
  const lines: LinesPhase = { kind: 'lines', secPerLine: 5, lines: ['One', 'Two', 'Three'] };

  it('picks the step for the elapsed time, clamped to the last', () => {
    expect(cueAt(grounding, 0)).toMatchObject({ stepIndex: 0, step: { prompt: 'See' } });
    expect(cueAt(grounding, 5_999)).toMatchObject({ stepIndex: 0 });
    expect(cueAt(grounding, 6_000)).toMatchObject({ stepIndex: 1, step: { prompt: 'Touch' } });
    expect(cueAt(grounding, 60_000)).toMatchObject({ stepIndex: 1 });
  });

  it('picks the line for the elapsed time, clamped to the last', () => {
    expect(cueAt(lines, 0)).toEqual({ kind: 'lines', lineIndex: 0, line: 'One' });
    expect(cueAt(lines, 10_000)).toEqual({ kind: 'lines', lineIndex: 2, line: 'Three' });
    expect(cueAt(lines, 15_000)).toEqual({ kind: 'lines', lineIndex: 2, line: 'Three' });
  });
});
