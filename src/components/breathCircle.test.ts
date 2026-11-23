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

  it('double inhale: the circle grows, grows a little more, then slowly shrinks', () => {
    const dbl: BreathingPhase = { kind: 'breathing', cycles: 1, inhaleSec: 3, topUpSec: 1, holdSec: 0, exhaleSec: 6 };
    const frame = createCircleAnimator();
    const at = (t: number, reduced = false) => frame(cueAt(dbl, t), t, t, reduced);
    const start = at(0).scale;
    const afterInhale = at(3_000).scale;
    const afterTopUp = at(4_000).scale;
    const midExhale = at(7_000).scale;
    const end = at(10_000).scale;
    expect(start).toBeCloseTo(BREATH_MIN_SCALE);
    const range = BREATH_MAX_SCALE - BREATH_MIN_SCALE;
    expect(afterInhale - start).toBeGreaterThan(0.7 * range); // the big grow
    expect(afterTopUp).toBe(BREATH_MAX_SCALE);
    expect(afterTopUp - afterInhale).toBeGreaterThan(0.1 * range); // a visible extra grow…
    expect(afterTopUp - afterInhale).toBeLessThan(afterInhale - start); // …that is the smaller one
    expect(midExhale).toBeLessThan(afterTopUp);
    expect(end).toBeCloseTo(BREATH_MIN_SCALE);

    // Reduced motion shows the same two stages as opacity, never scale.
    const still = createCircleAnimator();
    const o = [0, 3_000, 4_000].map((t) => still(cueAt(dbl, t), t, t, true));
    expect(new Set(o.map((f) => f.scale)).size).toBe(1);
    const opacities = o.map((f) => f.opacity);
    expect(opacities).toEqual([...opacities].sort((x, y) => x - y)); // rising through both inhales
    expect(new Set(opacities).size).toBe(3); // three distinct steps
  });
});
