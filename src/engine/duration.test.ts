import { describe, expect, it } from 'vitest';
import { breathingCycleSec, phaseDurationSec, protocolDurationSec } from './duration';

describe('breathingCycleSec', () => {
  it('sums inhale, hold and exhale', () => {
    expect(breathingCycleSec({ inhaleSec: 4, holdSec: 2, exhaleSec: 6 })).toBe(12);
  });

  it('includes the optional hold after exhaling (box breathing)', () => {
    expect(breathingCycleSec({ inhaleSec: 4, holdSec: 4, exhaleSec: 4, holdOutSec: 4 })).toBe(16);
  });

  it('4-7-8 is a 19s cycle', () => {
    expect(breathingCycleSec({ inhaleSec: 4, holdSec: 7, exhaleSec: 8 })).toBe(19);
    expect(phaseDurationSec({ kind: 'breathing', cycles: 3, inhaleSec: 4, holdSec: 7, exhaleSec: 8 })).toBe(57);
  });

  it('double inhale counts the top-up inhale: 3 + 1 + 6 = 10s', () => {
    expect(breathingCycleSec({ inhaleSec: 3, topUpSec: 1, holdSec: 0, exhaleSec: 6 })).toBe(10);
    expect(phaseDurationSec({ kind: 'breathing', cycles: 6, inhaleSec: 3, topUpSec: 1, holdSec: 0, exhaleSec: 6 })).toBe(60);
  });

  it('allows zero-length holds', () => {
    expect(breathingCycleSec({ inhaleSec: 4, holdSec: 0, exhaleSec: 6, holdOutSec: 0 })).toBe(10);
  });
});

describe('phaseDurationSec', () => {
  it('breathing = cycles × cycle length', () => {
    expect(phaseDurationSec({ kind: 'breathing', cycles: 4, inhaleSec: 4, holdSec: 2, exhaleSec: 6 })).toBe(48);
  });

  it('grounding = steps × secPerStep', () => {
    const step = { sense: 'see', count: 1, prompt: 'Look.' } as const;
    expect(phaseDurationSec({ kind: 'grounding', secPerStep: 7, steps: [step, step, step] })).toBe(21);
  });

  it('lines = lines × secPerLine', () => {
    expect(phaseDurationSec({ kind: 'lines', lines: ['a', 'b'], secPerLine: 5 })).toBe(10);
  });
});

describe('protocolDurationSec', () => {
  it('sums all phases', () => {
    expect(
      protocolDurationSec({
        phases: [
          { kind: 'breathing', cycles: 1, inhaleSec: 4, holdSec: 2, exhaleSec: 6 },
          { kind: 'lines', lines: ['a'], secPerLine: 5 },
        ],
      }),
    ).toBe(17);
  });

  it('is 0 for no phases', () => {
    expect(protocolDurationSec({ phases: [] })).toBe(0);
  });
});
