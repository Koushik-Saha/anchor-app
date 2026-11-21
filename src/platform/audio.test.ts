import { afterEach, describe, expect, it, vi } from 'vitest';
import * as audio from './audio';
import { PHASE_TONE, PITCH_HZ, createWebAudio, type ToneSpec } from './audio';

const fakeAdapter = () => ({
  supported: true,
  playTone: vi.fn<(tone: ToneSpec) => void>(),
  prime: vi.fn<() => void>(),
  suspend: vi.fn<() => void>(),
});

describe('audio module', () => {
  afterEach(() => audio.setEnabled(false));

  it('is disabled by default, so no tone plays until settings.sound is on', () => {
    const fake = fakeAdapter();
    audio.setAdapter(fake);
    expect(audio.isEnabled()).toBe(false);
    audio.toneOnPhaseChange('low');
    expect(fake.playTone).not.toHaveBeenCalled();
  });

  it('plays a soft tone at the chosen pitch once enabled', () => {
    const fake = fakeAdapter();
    audio.setAdapter(fake);
    audio.setEnabled(true);
    audio.toneOnPhaseChange('mid');
    audio.toneOnPhaseChange();
    expect(fake.playTone.mock.calls).toEqual([
      [{ frequencyHz: PITCH_HZ.mid, ...PHASE_TONE }],
      [{ frequencyHz: PITCH_HZ.low, ...PHASE_TONE }],
    ]);
    expect(PHASE_TONE.gain).toBeLessThanOrEqual(0.1);
  });

  it('suspends output when disabled', () => {
    const fake = fakeAdapter();
    audio.setAdapter(fake);
    audio.setEnabled(true);
    audio.setEnabled(false);
    expect(fake.suspend).toHaveBeenCalledOnce();
  });

  it('never throws when the adapter does', () => {
    const boom = () => {
      throw new Error('blocked');
    };
    audio.setAdapter({ supported: true, playTone: boom, prime: boom, suspend: boom });
    audio.setEnabled(true);
    expect(() => audio.toneOnPhaseChange('low')).not.toThrow();
    expect(() => audio.prime()).not.toThrow();
    expect(() => audio.setEnabled(false)).not.toThrow();
  });
});

describe('createWebAudio', () => {
  it('is an unsupported no-op without Web Audio', () => {
    const web = createWebAudio(undefined);
    expect(web.supported).toBe(false);
    expect(() => {
      web.prime();
      web.playTone({ frequencyHz: 196, ...PHASE_TONE });
      web.suspend();
    }).not.toThrow();
  });

  it('survives an AudioContext constructor that throws', () => {
    function Throwing(): never {
      throw new Error('too many contexts');
    }
    const web = createWebAudio(Throwing as unknown as new () => AudioContext);
    expect(web.supported).toBe(true);
    expect(() => web.playTone({ frequencyHz: 196, ...PHASE_TONE })).not.toThrow();
  });
});
