import { describe, expect, it } from 'vitest';
import type { Protocol } from './types';
import { validateProtocol } from './validate';

const valid: Protocol = {
  id: 'test-protocol',
  name: 'Test protocol',
  description: 'A test.',
  approxSeconds: 30,
  phases: [
    { kind: 'breathing', cycles: 1, inhaleSec: 4, holdSec: 2, exhaleSec: 6 },
    { kind: 'grounding', secPerStep: 6, steps: [{ sense: 'see', count: 5, prompt: 'Find 5 things you can see.' }] },
    { kind: 'lines', lines: ['Line one'], secPerLine: 5 },
  ],
};

describe('validateProtocol', () => {
  it('accepts a well-formed protocol', () => {
    expect(validateProtocol(valid)).toEqual([]);
  });

  it('rejects a protocol with no phases', () => {
    expect(validateProtocol({ ...valid, phases: [] })).toContain('protocol needs at least one phase');
  });

  it('rejects bad metadata', () => {
    const errors = validateProtocol({ ...valid, id: 'Not Kebab', name: '', description: ' ', approxSeconds: 0 });
    expect(errors).toEqual([
      'id "Not Kebab" must be kebab-case',
      'name is empty',
      'description is empty',
      'approxSeconds must be > 0',
    ]);
  });

  it('rejects invalid breathing timings', () => {
    const errors = validateProtocol({
      ...valid,
      phases: [{ kind: 'breathing', cycles: 0, inhaleSec: 0, holdSec: -1, exhaleSec: Number.NaN, holdOutSec: -2 }],
    });
    expect(errors).toHaveLength(5);
  });

  it('rejects empty grounding, bad steps and non-positive secPerStep', () => {
    expect(validateProtocol({ ...valid, phases: [{ kind: 'grounding', secPerStep: 6, steps: [] }] })).toHaveLength(1);
    const errors = validateProtocol({
      ...valid,
      phases: [{ kind: 'grounding', secPerStep: 0, steps: [{ sense: 'hear', count: 1.5, prompt: ' ' }] }],
    });
    expect(errors).toHaveLength(3);
  });

  it('rejects empty lines and non-positive secPerLine', () => {
    const errors = validateProtocol({ ...valid, phases: [{ kind: 'lines', lines: [''], secPerLine: 0 }] });
    expect(errors).toHaveLength(2);
  });
});
