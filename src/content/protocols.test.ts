import { describe, expect, it } from 'vitest';
import { protocolDurationSec, validateProtocol, type Protocol } from '../engine';
import { DEFAULT_PROTOCOL_ID, getProtocol, isProtocolId, protocols } from './protocols';

// Guards every protocol shipped in the bundle, so bad content fails CI, not a user mid-panic.
const all: readonly Protocol[] = protocols;
const cases = all.map((p) => [p.id, p] as const);

/** Every piece of text shown during a reset. */
function screenText(p: Protocol): string[] {
  return p.phases.flatMap((phase) => {
    switch (phase.kind) {
      case 'breathing':
        return [];
      case 'grounding':
        return phase.steps.map((s) => s.prompt);
      case 'lines':
        return [...phase.lines];
    }
  });
}

const wordCount = (s: string) => s.trim().split(/\s+/).length;

describe('bundled protocols', () => {
  it('ships exactly the six spec protocols, free ones first', () => {
    expect(all.map((p) => [p.id, p.locked])).toEqual([
      ['classic-90', false],
      ['breathing-60', false],
      ['grounding-only', false],
      ['box-breathing', true],
      ['extended-3min', true],
      ['night-protocol', true],
    ]);
  });

  it('have unique ids', () => {
    const ids = all.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(cases)('%s is structurally valid', (_id, p) => {
    expect(validateProtocol(p)).toEqual([]);
  });

  it.each(cases)('%s total duration is within 10% of approxSeconds', (_id, p) => {
    const actual = protocolDurationSec(p);
    expect(Math.abs(actual - p.approxSeconds) / p.approxSeconds).toBeLessThanOrEqual(0.1);
  });

  it.each(cases)('%s keeps every on-screen line to 8 words or fewer', (_id, p) => {
    for (const text of screenText(p)) expect(wordCount(text), text).toBeLessThanOrEqual(8);
  });

  it('the default protocol is free and exists', () => {
    expect(getProtocol(DEFAULT_PROTOCOL_ID)?.locked).toBe(false);
  });

  it('getProtocol / isProtocolId look up by id', () => {
    expect(getProtocol('box-breathing')?.name).toBe('Box breathing');
    expect(getProtocol('nope')).toBeUndefined();
    expect(isProtocolId('night-protocol')).toBe(true);
    expect(isProtocolId('nope')).toBe(false);
  });
});

describe('spec details', () => {
  const get = (id: string): Protocol => {
    const p = getProtocol(id);
    if (!p) throw new Error(`missing ${id}`);
    return p;
  };

  it('classic-90: 4×(4/2/6) breathing → 5-4-3-2-1 grounding → 3 settle lines at 5s', () => {
    const [breath, ground, settle] = get('classic-90').phases;
    expect(breath).toMatchObject({ kind: 'breathing', cycles: 4, inhaleSec: 4, holdSec: 2, exhaleSec: 6 });
    expect(ground?.kind === 'grounding' && ground.steps.map((s) => [s.sense, s.count])).toEqual([
      ['see', 5],
      ['touch', 4],
      ['hear', 3],
      ['smell', 2],
      ['taste', 1],
    ]);
    expect(settle).toEqual({
      kind: 'lines',
      lines: ['This always passes.', 'You are safe right now.', 'Just breathe with the circle.'],
      secPerLine: 5,
    });
  });

  it('breathing-60: breathing only, 5 cycles of 4/2/6', () => {
    expect(get('breathing-60').phases).toEqual([
      { kind: 'breathing', cycles: 5, inhaleSec: 4, holdSec: 2, exhaleSec: 6 },
    ]);
  });

  it('grounding-only: grounding + 2 settle lines', () => {
    const phases = get('grounding-only').phases;
    expect(phases.map((p) => p.kind)).toEqual(['grounding', 'lines']);
    expect(phases[1]?.kind === 'lines' && phases[1].lines).toHaveLength(2);
  });

  it('box-breathing: 4 cycles of 4/4/4/4', () => {
    expect(get('box-breathing').phases).toEqual([
      { kind: 'breathing', cycles: 4, inhaleSec: 4, holdSec: 4, exhaleSec: 4, holdOutSec: 4 },
    ]);
  });

  it('extended-3min: 6 breathing cycles → grounding → lines, ~3 minutes', () => {
    const p = get('extended-3min');
    expect(p.phases.map((ph) => ph.kind)).toEqual(['breathing', 'grounding', 'lines']);
    expect(p.phases[0]).toMatchObject({ cycles: 6 });
    expect(p.approxSeconds).toBe(180);
  });

  it('night-protocol: 4 cycles of 4/2/8, no tones, extra dim', () => {
    const p = get('night-protocol');
    expect(p.phases).toEqual([{ kind: 'breathing', cycles: 4, inhaleSec: 4, holdSec: 2, exhaleSec: 8 }]);
    expect(p.noTones).toBe(true);
    expect(p.extraDim).toBe(true);
  });

  it('only the night protocol changes presentation', () => {
    for (const p of all.filter((x) => x.id !== 'night-protocol')) {
      expect(p.noTones ?? false).toBe(false);
      expect(p.extraDim ?? false).toBe(false);
    }
  });
});
