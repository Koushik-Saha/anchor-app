import { describe, expect, it } from 'vitest';
import { HELPED_VALUES, formatDuration, formatWhen, helpedLabel } from './format';
import { protocols } from './protocols';

describe('formatDuration', () => {
  it('uses seconds under a minute and for odd short durations, minutes otherwise', () => {
    expect(formatDuration(40)).toBe('40 sec');
    expect(formatDuration(55)).toBe('55 sec');
    expect(formatDuration(60)).toBe('1 min');
    expect(formatDuration(65)).toBe('65 sec');
    expect(formatDuration(90)).toBe('90 sec');
    expect(formatDuration(120)).toBe('2 min');
    expect(formatDuration(180)).toBe('3 min');
  });

  it('gives every bundled protocol a short label', () => {
    for (const p of protocols) expect(formatDuration(p.approxSeconds)).toMatch(/^\d+ (sec|min)$/);
  });
});

describe('helped labels', () => {
  it('cover all four answers in order', () => {
    expect(HELPED_VALUES.map((value) => helpedLabel(value))).toEqual(['Breathing', 'Grounding', 'Both', 'Not sure']);
    expect(helpedLabel('not-sure')).toBe('Not sure');
  });
});

describe('formatWhen', () => {
  it('formats date and time in the given locale', () => {
    const local = new Date(2026, 10, 20, 17, 37).toISOString(); // local time, so the test is timezone-proof
    expect(formatWhen(local, 'en-US')).toBe('Fri, Nov 20 · 5:37 PM');
  });

  it('returns empty for a bad date instead of "Invalid Date"', () => {
    expect(formatWhen('not a date', 'en-US')).toBe('');
  });
});
