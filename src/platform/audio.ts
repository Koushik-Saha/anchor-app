/**
 * Audio adapter (CLAUDE.md rule 4). Use as a namespace:
 *   import * as audio from '../platform/audio';
 *   audio.toneOnPhaseChange('low');
 *
 * Soft tones generated with the Web Audio API — sine oscillator, low gain,
 * fade in/out. No audio files: nothing to download, works offline.
 *
 * Disabled by default; SettingsProvider calls setEnabled(settings.sound).
 * Browsers (iOS especially) only allow sound after a user gesture, so call
 * prime() from a tap handler — e.g. the "Start reset" button — before tones
 * are needed on a timer. Capacitor's web view runs Web Audio as-is; a native
 * adapter is only needed if that ever proves insufficient (setAdapter()).
 *
 * Nothing here ever throws.
 */

export type TonePitch = 'low' | 'mid';

/** G3 and C4: warm, low, never shrill. */
export const PITCH_HZ: Readonly<Record<TonePitch, number>> = { low: 196, mid: 262 };

export interface ToneSpec {
  frequencyHz: number;
  durationMs: number;
  /** 0–1. Keep low: these are meant to be barely-there. */
  gain: number;
}

export const PHASE_TONE = { durationMs: 700, gain: 0.06 } as const;

export interface AudioAdapter {
  readonly supported: boolean;
  playTone(tone: ToneSpec): void;
  /** Unlock audio output. Must be called from a user gesture. */
  prime(): void;
  /** Free audio hardware while sound is off. */
  suspend(): void;
}

type AudioContextCtor = new () => AudioContext;

function browserAudioContext(): AudioContextCtor | undefined {
  return typeof AudioContext === 'undefined' ? undefined : AudioContext;
}

export function createWebAudio(Ctor: AudioContextCtor | undefined = browserAudioContext()): AudioAdapter {
  let ctx: AudioContext | null = null;

  // Created lazily — creating it outside a gesture just yields a suspended context.
  const getContext = (): AudioContext | null => {
    if (ctx || !Ctor) return ctx;
    try {
      ctx = new Ctor();
    } catch {
      ctx = null;
    }
    return ctx;
  };

  const resume = (c: AudioContext): void => {
    if (c.state === 'suspended') c.resume().catch(() => undefined);
  };

  return {
    supported: Ctor !== undefined,

    prime() {
      const c = getContext();
      if (!c) return;
      try {
        resume(c);
        // A 1-sample silent buffer started inside the gesture unlocks output on iOS.
        const src = c.createBufferSource();
        src.buffer = c.createBuffer(1, 1, c.sampleRate);
        src.connect(c.destination);
        src.start();
      } catch {
        /* ignore */
      }
    },

    suspend() {
      if (ctx?.state === 'running') ctx.suspend().catch(() => undefined);
    },

    playTone({ frequencyHz, durationMs, gain }) {
      const c = getContext();
      if (!c) return;
      try {
        resume(c);
        const osc = c.createOscillator();
        const amp = c.createGain();
        osc.type = 'sine';
        osc.frequency.value = frequencyHz;

        // Gentle envelope: fade in, hold, fade out — no clicks.
        const now = c.currentTime;
        const dur = durationMs / 1000;
        const fade = Math.min(0.2, dur / 3);
        amp.gain.setValueAtTime(0, now);
        amp.gain.linearRampToValueAtTime(gain, now + fade);
        amp.gain.setValueAtTime(gain, now + dur - fade);
        amp.gain.linearRampToValueAtTime(0, now + dur);

        osc.connect(amp).connect(c.destination);
        osc.start(now);
        osc.stop(now + dur);
        osc.onended = () => {
          osc.disconnect();
          amp.disconnect();
        };
      } catch {
        /* audio blocked or unavailable: no-op */
      }
    },
  };
}

// ─── Module API (what call sites use) ────────────────────────────────────────

let adapter: AudioAdapter = createWebAudio();
let enabled = false; // stays off until settings.sound is true

export function setAdapter(next: AudioAdapter): void {
  adapter = next;
}

export function isSupported(): boolean {
  return adapter.supported;
}

export function isEnabled(): boolean {
  return enabled;
}

export function setEnabled(on: boolean): void {
  enabled = on;
  if (!on) {
    try {
      adapter.suspend();
    } catch {
      /* ignore */
    }
  }
}

/** Call from a tap handler so later timer-driven tones can play. Safe to call any time. */
export function prime(): void {
  try {
    adapter.prime();
  } catch {
    /* ignore */
  }
}

/** One soft tone marking a phase change. No-op when sound is off or unsupported. */
export function toneOnPhaseChange(pitch: TonePitch = 'low'): void {
  if (!enabled) return;
  try {
    adapter.playTone({ frequencyHz: PITCH_HZ[pitch], ...PHASE_TONE });
  } catch {
    /* ignore */
  }
}
