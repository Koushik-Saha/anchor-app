import { afterEach, describe, expect, it, vi } from 'vitest';
import * as haptics from './haptics';
import { createWebHaptics, type HapticsAdapter } from './haptics';

describe('createWebHaptics', () => {
  it('maps each pattern to a vibration timing', async () => {
    const vibrate = vi.fn(() => true);
    const web = createWebHaptics(vibrate);
    expect(web.supported).toBe(true);
    await web.pulse('tap');
    await web.pulse('phase');
    await web.pulse('done');
    expect(vibrate.mock.calls).toEqual([[12], [35], [[40, 90, 40]]]);
  });

  it('is an unsupported no-op without navigator.vibrate (iOS Safari, Node)', async () => {
    const web = createWebHaptics(undefined);
    expect(web.supported).toBe(false);
    await expect(web.pulse('phase')).resolves.toBeUndefined();
    expect(createWebHaptics().supported).toBe(false); // Node has no navigator.vibrate
  });
});

describe('pulse()', () => {
  afterEach(() => {
    haptics.setEnabled(true);
    haptics.setAdapter(createWebHaptics(undefined));
  });

  it('is enabled by default and forwards to the adapter', () => {
    const fake: HapticsAdapter = { supported: true, pulse: vi.fn(() => Promise.resolve()) };
    haptics.setAdapter(fake);
    expect(haptics.isEnabled()).toBe(true);
    haptics.pulse('done');
    expect(fake.pulse).toHaveBeenCalledWith('done');
  });

  it('does nothing when disabled', () => {
    const fake: HapticsAdapter = { supported: true, pulse: vi.fn(() => Promise.resolve()) };
    haptics.setAdapter(fake);
    haptics.setEnabled(false);
    haptics.pulse('tap');
    expect(fake.pulse).not.toHaveBeenCalled();
  });

  it('never throws, whether the adapter throws or rejects', async () => {
    haptics.setAdapter({
      supported: true,
      pulse: () => {
        throw new Error('sync');
      },
    });
    expect(() => haptics.pulse('tap')).not.toThrow();

    const rejected = vi.fn(() => Promise.reject(new Error('async')));
    haptics.setAdapter({ supported: true, pulse: rejected });
    expect(() => haptics.pulse('tap')).not.toThrow();
    await Promise.resolve(); // let the rejection settle; an unhandled one would fail the run
    expect(rejected).toHaveBeenCalled();

    const vibrateThrows = createWebHaptics(() => {
      throw new Error('blocked');
    });
    haptics.setAdapter(vibrateThrows);
    expect(() => haptics.pulse('phase')).not.toThrow();
  });
});
