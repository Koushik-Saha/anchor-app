import { describe, expect, it } from 'vitest';
import type { Helped, HistoryEntry } from '../platform/storage';
import {
  formatHour,
  majorityOf,
  MIN_RESETS,
  NO_PATTERNS_YET,
  statementText,
  whatHelpedStatements,
  type WhatHelpedStatement,
} from './whatHelped';

/** A local-time timestamp, so the hour tests hold in any timezone. */
const at = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute).toISOString();

const run = (
  helped?: Helped,
  { day = 1, hour = 9, minute = 0, protocolId = 'classic-90', completed = true }: Partial<{ day: number; hour: number; minute: number; protocolId: string; completed: boolean }> = {},
): HistoryEntry => ({ at: at(day, hour, minute), protocolId, completed, ...(helped ? { helped } : {}) });

/** Spread over different hours and resets, so only the statement under test can appear. */
const spread = (helped: (Helped | undefined)[]): HistoryEntry[] => {
  const ids = ['classic-90', 'box-breathing', 'night-protocol', 'grounding-only', 'breathing-60', 'extended-3min'];
  return helped.map((h, i) => run(h, { day: i + 1, hour: (i * 4) % 24, protocolId: ids[i % ids.length] ?? 'classic-90' }));
};
const ofKind = <K extends WhatHelpedStatement['kind']>(list: WhatHelpedStatement[], kind: K) =>
  list.find((s): s is Extract<WhatHelpedStatement, { kind: K }> => s.kind === kind);
const texts = (history: HistoryEntry[]) => whatHelpedStatements(history).map(statementText);

describe('majorityOf', () => {
  it('finds a value held by more than half', () => {
    expect(majorityOf(['a', 'b', 'a'])).toEqual({ value: 'a', count: 2 });
  });
  it('a tie or a mere plurality is not a majority', () => {
    expect(majorityOf(['a', 'b'])).toBeNull();
    expect(majorityOf(['a', 'a', 'b', 'b', 'c'])).toBeNull();
    expect(majorityOf([])).toBeNull();
  });
});

describe('no statement without supporting data', () => {
  it('empty history shows nothing', () => {
    expect(whatHelpedStatements([])).toEqual([]);
  });

  it(`under ${MIN_RESETS} resets shows nothing, even when they all agree`, () => {
    const two = [run('grounding', { day: 1 }), run('grounding', { day: 2 })];
    expect(whatHelpedStatements(two)).toEqual([]);
  });

  it('stopped resets never count', () => {
    const stopped = [1, 2, 3, 4].map((day) => run(undefined, { day, completed: false, protocolId: 'box-breathing' }));
    expect(whatHelpedStatements(stopped)).toEqual([]);
  });

  it('three spread-out resets with no answers support no claim', () => {
    expect(whatHelpedStatements(spread([undefined, undefined, undefined]))).toEqual([]);
  });

  it('"not sure" answers support no claim about what helped', () => {
    expect(ofKind(whatHelpedStatements(spread(['not-sure', 'not-sure', 'not-sure'])), 'helped')).toBeUndefined();
  });

  it('a split with no majority makes no claim', () => {
    expect(ofKind(whatHelpedStatements(spread(['breathing', 'grounding', 'not-sure', 'not-sure'])), 'helped')).toBeUndefined();
  });

  it('a reset id no longer in the app is never named', () => {
    const old = [1, 2, 3].map((day) => run(undefined, { day, hour: day * 5, protocolId: 'retired-reset' }));
    expect(ofKind(whatHelpedStatements(old), 'most-used')).toBeUndefined();
  });

  it('the calm line is the exact wording', () => {
    expect(NO_PATTERNS_YET).toBe('Finish a few resets and patterns will show up here.');
  });
});

describe('what helped', () => {
  it('counts the last five answers', () => {
    const history = spread(['breathing', 'grounding', 'grounding', 'grounding', 'not-sure', 'grounding']);
    expect(ofKind(whatHelpedStatements(history), 'helped')).toEqual({ kind: 'helped', subject: 'grounding', count: 4, total: 5 });
    expect(texts(history)).toContain('Grounding helped 4 of your last 5 times.');
  });

  it('unanswered resets are not in the count', () => {
    const history = spread(['breathing', undefined, 'breathing', undefined, 'grounding']);
    expect(ofKind(whatHelpedStatements(history), 'helped')).toMatchObject({ subject: 'breathing', count: 2, total: 3 });
  });

  it('"both" counts for each, and an even result names both', () => {
    const history = spread(['both', 'both', 'both']);
    expect(ofKind(whatHelpedStatements(history), 'helped')).toMatchObject({ subject: 'both', count: 3, total: 3 });
    expect(texts(history)).toContain('Breathing and grounding helped 3 of your last 3 times.');
  });
});

describe('time of day', () => {
  it('names the hour most resets happen', () => {
    const history = [run(undefined, { day: 1, hour: 23 }), run(undefined, { day: 2, hour: 23 }), run(undefined, { day: 3, hour: 8, protocolId: 'box-breathing' })];
    expect(ofKind(whatHelpedStatements(history), 'time')).toEqual({ kind: 'time', hour: 23 });
    expect(texts(history)).toContain('You use Anchor most around 11 pm.');
  });

  it('rounds to the nearest hour, across midnight', () => {
    const history = [run(undefined, { day: 1, hour: 22, minute: 45 }), run(undefined, { day: 2, hour: 23, minute: 10 }), run(undefined, { day: 3, hour: 23, minute: 29 })];
    expect(ofKind(whatHelpedStatements(history), 'time')?.hour).toBe(23);
    const midnight = [run(undefined, { day: 1, hour: 23, minute: 40 }), run(undefined, { day: 2, hour: 0, minute: 10 }), run(undefined, { day: 3, hour: 0 })];
    expect(ofKind(whatHelpedStatements(midnight), 'time')?.hour).toBe(0);
  });

  it('skips unreadable timestamps', () => {
    const bad = ['nope', 'nope', 'nope'].map((value) => ({ at: value, protocolId: 'classic-90', completed: true }));
    expect(ofKind(whatHelpedStatements(bad), 'time')).toBeUndefined();
  });

  it.each([[0, '12 am'], [1, '1 am'], [11, '11 am'], [12, '12 pm'], [13, '1 pm'], [23, '11 pm']])('%i → %s', (hour, text) => {
    expect(formatHour(hour)).toBe(text);
  });
});

describe('most-used reset', () => {
  it('names the reset used more than half the time', () => {
    const history = [1, 2, 3].map((day) => run(undefined, { day, hour: day * 6, protocolId: 'box-breathing' }));
    history.push(run(undefined, { day: 4, hour: 3, protocolId: 'classic-90' }));
    expect(texts(history)).toContain('Box breathing is your most-used reset.');
  });

  it('a mere plurality is not enough', () => {
    const history = spread([undefined, undefined, undefined, undefined, undefined]);
    expect(ofKind(whatHelpedStatements(history), 'most-used')).toBeUndefined();
  });
});
