import { describe, expect, it } from 'vitest';
import { TOP_UP_FROM, cueAt, easeInOut } from './cue';
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

describe('4-7-8 pattern (in 4, hold 7, out 8)', () => {
  const p478: BreathingPhase = { kind: 'breathing', cycles: 3, inhaleSec: 4, holdSec: 7, exhaleSec: 8 };

  it('inhale 0–4s, hold 4–11s, exhale 11–19s, then the next cycle', () => {
    expect(cueAt(p478, 0)).toMatchObject({ part: 'inhale', cycle: 0, level: 0 });
    expect(cueAt(p478, 2_000)).toMatchObject({ part: 'inhale', partProgress: 0.5 });
    expect(cueAt(p478, 3_999)).toMatchObject({ part: 'inhale' });
    expect(cueAt(p478, 4_000)).toMatchObject({ part: 'hold', partProgress: 0, level: 1 });
    expect(cueAt(p478, 7_500)).toMatchObject({ part: 'hold', partProgress: 0.5, level: 1 });
    expect(cueAt(p478, 10_999)).toMatchObject({ part: 'hold' });
    expect(cueAt(p478, 11_000)).toMatchObject({ part: 'exhale', partProgress: 0, level: 1 });
    expect(cueAt(p478, 15_000)).toMatchObject({ part: 'exhale', partProgress: 0.5 });
    expect(cueAt(p478, 19_000)).toMatchObject({ part: 'inhale', cycle: 1, level: 0 });
    expect(cueAt(p478, 38_000)).toMatchObject({ part: 'inhale', cycle: 2 });
  });

  it('ends at the bottom of the last exhale (3 × 19s = 57s)', () => {
    expect(cueAt(p478, 57_000)).toMatchObject({ cycle: 2, part: 'exhale', partProgress: 1, level: 0 });
  });
});

describe('double inhale pattern (inhale 3s, top-up 1s, exhale 6s)', () => {
  const dbl: BreathingPhase = { kind: 'breathing', cycles: 6, inhaleSec: 3, topUpSec: 1, holdSec: 0, exhaleSec: 6 };
  const level = (t: number) => (cueAt(dbl, t) as { level: number }).level;

  it('inhale 0–3s, top-up 3–4s, exhale 4–10s (no hold), then the next cycle', () => {
    expect(cueAt(dbl, 0)).toMatchObject({ part: 'inhale', cycle: 0, level: 0 });
    expect(cueAt(dbl, 1_500)).toMatchObject({ part: 'inhale', partProgress: 0.5 });
    expect(cueAt(dbl, 2_999)).toMatchObject({ part: 'inhale' });
    expect(cueAt(dbl, 3_000)).toMatchObject({ part: 'topUp', partProgress: 0 });
    expect(cueAt(dbl, 3_500)).toMatchObject({ part: 'topUp', partProgress: 0.5 });
    expect(cueAt(dbl, 4_000)).toMatchObject({ part: 'exhale', partProgress: 0, level: 1 });
    expect(cueAt(dbl, 7_000)).toMatchObject({ part: 'exhale', partProgress: 0.5 });
    expect(cueAt(dbl, 10_000)).toMatchObject({ part: 'inhale', cycle: 1, level: 0 });
    expect(cueAt(dbl, 60_000)).toMatchObject({ cycle: 5, part: 'exhale', partProgress: 1, level: 0 });
  });

  it('two-stage inhale: big grow to TOP_UP_FROM, small extra grow to full, then a slow shrink', () => {
    expect(level(3_000)).toBeCloseTo(TOP_UP_FROM); // end of first inhale = start of top-up: no jump
    expect(level(2_999)).toBeCloseTo(TOP_UP_FROM, 2);
    expect(level(1_500)).toBeCloseTo(TOP_UP_FROM / 2);
    expect(level(3_500)).toBeCloseTo((TOP_UP_FROM + 1) / 2);
    expect(level(3_999)).toBeCloseTo(1, 3);
    // The extra grow is visibly smaller than the first one.
    expect(1 - TOP_UP_FROM).toBeLessThan(TOP_UP_FROM / 2);
    // Rising through both inhales, falling through the exhale.
    const up = [0, 500, 1_000, 2_000, 3_000, 3_250, 3_750, 3_999].map(level);
    expect(up).toEqual([...up].sort((a, b) => a - b));
    const down = [4_000, 5_000, 6_000, 8_000, 9_999].map(level);
    expect(down).toEqual([...down].sort((a, b) => b - a));
  });

  it('without a top-up, the inhale still reaches full (existing patterns unchanged)', () => {
    expect((cueAt(breath, 3_999) as { level: number }).level).toBeCloseTo(1, 3);
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
