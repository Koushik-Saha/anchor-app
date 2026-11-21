import { describe, expect, it } from 'vitest';
import { PLAN_LIMITS, callLabel, cleanPlan, isPlanEmpty, telHref } from './plan';

describe('telHref', () => {
  it('turns typed numbers into dialable tel: links', () => {
    expect(telHref('+1 (555) 010-0199')).toBe('tel:+15550100199');
    expect(telHref('555 0100')).toBe('tel:5550100');
    expect(telHref(' 988 ')).toBe('tel:988');
    expect(telHref('+44 20 7946 0958')).toBe('tel:+442079460958');
  });

  it('keeps pause/wait characters for extensions', () => {
    expect(telHref('555 0100,22')).toBe('tel:5550100,22');
  });

  it('refuses things that are not numbers (no tel: injection)', () => {
    expect(telHref(undefined)).toBeNull();
    expect(telHref('')).toBeNull();
    expect(telHref('mom')).toBeNull();
    expect(telHref('12')).toBeNull();
    expect(telHref('javascript:alert(1)')).toBeNull();
  });

  it('strips everything that is not part of a number, so nothing can be injected', () => {
    expect(telHref('555?body=x&foo')).toBe('tel:555');
    for (const input of ['+1 555 <script>', '555"onclick="x', 'tel:555;ext=1', '555\n0100']) {
      expect(telHref(input) ?? '').toMatch(/^(tel:\+?[0-9,;]+)?$/);
    }
  });
});

describe('callLabel', () => {
  it('uses the contact name when there is one', () => {
    expect(callLabel({ contactName: 'Sam', contactPhone: '555 0100' })).toBe('Call Sam');
    expect(callLabel({ contactName: '  ', contactPhone: '555 0100' })).toBe('Call my contact');
    expect(callLabel(undefined)).toBe('Call my contact');
  });
});

describe('cleanPlan / isPlanEmpty', () => {
  it('trims, drops empty fields and enforces limits', () => {
    expect(cleanPlan({ note: '  This passes.  ', contactName: '', medsNote: '   ' })).toEqual({ note: 'This passes.' });
    expect(cleanPlan({ note: 'x'.repeat(500) }).note).toHaveLength(PLAN_LIMITS.note);
  });

  it('knows when nothing is set', () => {
    expect(isPlanEmpty(undefined)).toBe(true);
    expect(isPlanEmpty({ note: ' ' })).toBe(true);
    expect(isPlanEmpty({ contactPhone: '555 0100' })).toBe(false);
  });
});
