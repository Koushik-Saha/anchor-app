import { describe, expect, it } from 'vitest';
import { cueAt } from '../engine/cue';
import type { BreathingPhase, LinesPhase } from '../engine/types';
import { BREATH_MAX_SCALE, BREATH_MIN_SCALE, REST_SCALE, createCircleAnimator } from './breathCircle';

const breath: BreathingPhase = { kind: 'breathing', cycles: 1, inhaleSec: 4, holdSec: 2, exhaleSec: 6 };
const lines: LinesPhase = { kind: 'lines', secPerLine: 5, lines: ['a', 'b'] };

describe('createCircleAnimator', () => {
  it('breathing: scale follows the breath exactly, opacity stays 1', () => {
    const frame = createCircleAnimator();
    expect(frame(cueAt(breath, 0), 0, 0, false)).toEqual({ scale: BREATH_MIN_SCALE, opacity: 1 });
    expect(frame(cueAt(breath, 2_000), 2_000, 2_000, false).scale).toBeCloseTo((BREATH_MIN_SCALE + BREATH_MAX_SCALE) / 2);
    expect(frame(cueAt(breath, 5_000), 5_000, 5_000, false)).toEqual({ scale: BREATH_MAX_SCALE, opacity: 1 });
    expect(frame(cueAt(breath, 12_000), 12_000, 12_000, false).scale).toBeCloseTo(BREATH_MIN_SCALE);
  });

  it('resting: eases from where breathing ended into a gentle pulse around mid-size', () => {
    const frame = createCircleAnimator();
    frame(cueAt(breath, 12_000), 12_000, 0, false); // ends small
    const first = frame(cueAt(lines, 0), 0, 16, false);
    expect(first.scale).toBeLessThan(REST_SCALE); // no jump

    let s = first;
    for (let t = 32; t <= 4_000; t += 16) s = frame(cueAt(lines, t), t, t, false);
    expect(s.scale).toBeGreaterThan(REST_SCALE - 0.01);
    expect(s.scale).toBeLessThan(REST_SCALE + 0.05);
  });

  it('reduced motion: scale never changes; the rhythm moves opacity instead', () => {
    const frame = createCircleAnimator();
    const samples = [0, 2_000, 5_000, 9_000, 12_000].map((t) => frame(cueAt(breath, t), t, t, true));
    expect(new Set(samples.map((s) => s.scale)).size).toBe(1);
    const opacity = samples.map((s) => s.opacity);
    expect(opacity[0]).toBeCloseTo(0.3);
    expect(opacity[2]).toBe(1);
    expect(opacity[4]).toBeCloseTo(0.3);
  });
});
