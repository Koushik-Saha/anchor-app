import { describe, expect, it } from 'vitest';
import {
  breathingCycleSec,
  createResetEngine,
  cueAt,
  protocolDurationSec,
  validateProtocol,
  type BreathPart,
  type FrameScheduler,
  type Protocol,
} from '../engine';
import {
  BREATH_PATTERNS,
  DEFAULT_BREATH_PATTERN_ID,
  type BreathPattern,
  getBreathPattern,
  isBreathPatternId,
  protocolWithChosenPattern,
  withBreathPattern,
} from './breathPatterns';
import { BREATH_LABELS } from './cueText';
import { boxBreathing, breathing60, classic90, extended3min, nightProtocol, protocols } from './protocols';

const wordCount = (s: string) => s.trim().split(/\s+/).length;
const breathingPhases = (p: Protocol) => p.phases.filter((ph) => ph.kind === 'breathing');

describe('breath patterns (data)', () => {
  it('ships the current two plus 4-7-8 and double inhale, with stable ids', () => {
    expect(BREATH_PATTERNS.map((p) => p.id)).toEqual(['4-2-6', 'box', '4-7-8', 'double-inhale']);
  });

  it('each has one short line (≤ 8 words) and a short name', () => {
    for (const p of BREATH_PATTERNS) {
      expect(wordCount(p.line), p.line).toBeLessThanOrEqual(8);
      expect(wordCount(p.name), p.name).toBeLessThanOrEqual(3);
    }
    expect(getBreathPattern('4-7-8').line).toBe('In 4, hold 7, out 8');
    expect(getBreathPattern('double-inhale').line).toBe('Two inhales, one long exhale');
  });

  it('timing: 4-7-8 is in 4 / hold 7 / out 8 (19s); double inhale is 3 + 1 top-up + 6 out (10s)', () => {
    expect(getBreathPattern('4-7-8').timing).toEqual({ inhaleSec: 4, holdSec: 7, exhaleSec: 8 });
    expect(breathingCycleSec(getBreathPattern('4-7-8').timing)).toBe(19);
    expect(getBreathPattern('double-inhale').timing).toEqual({ inhaleSec: 3, topUpSec: 1, holdSec: 0, exhaleSec: 6 });
    expect(breathingCycleSec(getBreathPattern('double-inhale').timing)).toBe(10);
  });

  it('the existing protocols still breathe exactly as before', () => {
    expect(breathingPhases(classic90)).toEqual([{ kind: 'breathing', cycles: 4, inhaleSec: 4, holdSec: 2, exhaleSec: 6 }]);
    expect(breathingPhases(boxBreathing)).toEqual([
      { kind: 'breathing', cycles: 4, inhaleSec: 4, holdSec: 4, exhaleSec: 4, holdOutSec: 4 },
    ]);
  });

  it('unknown or old stored ids fall back to the default 4-2-6', () => {
    expect(DEFAULT_BREATH_PATTERN_ID).toBe('4-2-6');
    for (const id of [undefined, null, 42, '', 'gone-pattern']) {
      expect(isBreathPatternId(id)).toBe(false);
      expect(getBreathPattern(id).id).toBe('4-2-6');
    }
  });
});

describe('which protocols let you choose', () => {
  it('only the breathing-only reset offers the picker', () => {
    expect(protocols.filter((p) => 'choosePattern' in p && p.choosePattern).map((p) => p.id)).toEqual(['breathing-60']);
  });

  it('the classic reset (and every other protocol) ignores the remembered pattern', () => {
    for (const p of [classic90, boxBreathing, extended3min, nightProtocol]) {
      for (const pattern of BREATH_PATTERNS) expect(protocolWithChosenPattern(p, pattern.id)).toBe(p);
    }
  });
});

const PATTERN_CASES: [string, BreathPattern][] = BREATH_PATTERNS.map((p) => [p.id, p]);

describe.each(PATTERN_CASES)('breathing-only reset with %s', (id, pattern) => {
  const run = protocolWithChosenPattern(breathing60, id);

  it('uses that pattern for its breathing step and stays valid', () => {
    expect(validateProtocol(run)).toEqual([]);
    const [phase] = breathingPhases(run);
    expect(phase).toMatchObject(pattern.timing);
    expect(run.id).toBe('breathing-60'); // history keeps the same protocol id
  });

  it('repeats the pattern for about the length of the step (within 10% of 60s)', () => {
    const total = protocolDurationSec(run);
    expect(Math.abs(total - breathing60.approxSeconds) / breathing60.approxSeconds).toBeLessThanOrEqual(0.1);
    expect(total % breathingCycleSec(pattern.timing)).toBe(0); // whole breaths only
  });

  it('starts, shows each part of the pattern, and completes in the engine', () => {
    let t = 1_000;
    const frames: (() => void)[] = [];
    const scheduler: FrameScheduler = {
      request(cb) {
        frames.push(cb);
        return () => void frames.splice(frames.indexOf(cb), 1);
      },
    };
    const engine = createResetEngine(run, { now: () => t, scheduler });
    const parts = new Set<BreathPart>();
    const labels = new Set<string>();
    let completed = false;
    engine.subscribe({
      onTick(e) {
        const cue = cueAt(e.phase, e.phaseElapsedMs);
        if (cue.kind === 'breathing') {
          parts.add(cue.part);
          labels.add(BREATH_LABELS[cue.part]);
        }
      },
      onComplete: () => void (completed = true),
    });

    engine.start();
    expect(engine.getState().status).toBe('running');
    const end = t + protocolDurationSec(run) * 1000 + 100;
    while (t < end && !completed) {
      t += 16;
      frames.splice(0).forEach((cb) => cb());
    }

    expect(completed).toBe(true);
    const expected = new Set<BreathPart>(['inhale', 'exhale']);
    if ((pattern.timing.topUpSec ?? 0) > 0) expected.add('topUp');
    if (pattern.timing.holdSec > 0) expected.add('hold');
    if ((pattern.timing.holdOutSec ?? 0) > 0) expected.add('holdOut');
    expect(parts).toEqual(expected);
    for (const label of labels) expect(wordCount(label)).toBeLessThanOrEqual(8);
    engine.dispose();
  });
});

describe('withBreathPattern', () => {
  it('only touches breathing phases and keeps each one near its length', () => {
    const switched = withBreathPattern(classic90, getBreathPattern('double-inhale'));
    expect(switched.phases[1]).toBe(classic90.phases[1]); // grounding untouched
    expect(switched.phases[2]).toBe(classic90.phases[2]); // lines untouched
    expect(switched.phases[0]).toMatchObject({ cycles: 5, inhaleSec: 3, topUpSec: 1 }); // 48s → 5 × 10s
  });

  it('never drops below one full breath', () => {
    const short: Protocol = { ...breathing60, phases: [{ kind: 'breathing', cycles: 1, inhaleSec: 1, holdSec: 0, exhaleSec: 1 }] };
    expect(withBreathPattern(short, getBreathPattern('4-7-8')).phases[0]).toMatchObject({ cycles: 1 });
  });
});
