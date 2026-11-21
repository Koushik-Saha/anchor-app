import { describe, expect, it, vi } from 'vitest';
import { boxBreathing, breathing60, classic90 } from '../content/protocols';
import {
  createResetEngine,
  type CompleteEvent,
  type EngineOptions,
  type EngineStatus,
  type FrameScheduler,
  type PhaseChangeEvent,
  type TickEvent,
} from './resetEngine';
import type { Protocol } from './types';

// ─── Test harness: fake monotonic clock + fake requestAnimationFrame ─────────

const T0 = 1_000; // never assume the clock starts at 0

function fakeClock() {
  let t = T0;
  let nextId = 0;
  const frames = new Map<number, () => void>();

  const scheduler: FrameScheduler = {
    request(cb) {
      const id = ++nextId;
      frames.set(id, cb);
      return () => void frames.delete(id);
    },
  };

  /** Run every callback queued for the next frame. */
  const frame = () => {
    const callbacks = [...frames.values()];
    frames.clear();
    for (const cb of callbacks) cb();
  };

  return {
    now: () => t,
    scheduler,
    frame,
    get time() {
      return t;
    },
    get pendingFrames() {
      return frames.size;
    },
    /** Let `ms` pass with a frame every `step()` ms — like rAF on a visible page. */
    advance(ms: number, step: () => number = () => 16) {
      const end = t + ms;
      while (t < end) {
        t = Math.min(t + step(), end);
        frame();
      }
    },
    /** Let `ms` pass with NO frames — page hidden, phone locked. */
    sleep(ms: number) {
      t += ms;
    },
  };
}

/** Irregular but deterministic frame intervals (all well under the interrupt threshold). */
function jitter() {
  const steps = [16, 17, 33, 8, 16, 50, 16, 7, 120];
  let i = 0;
  return () => steps[i++ % steps.length] ?? 16;
}

function harness(protocol: Protocol = classic90, options: EngineOptions = {}) {
  const clock = fakeClock();
  const engine = createResetEngine(protocol, { now: clock.now, scheduler: clock.scheduler, ...options });
  const log = {
    phases: [] as PhaseChangeEvent[],
    ticks: [] as TickEvent[],
    completes: [] as CompleteEvent[],
    states: [] as EngineStatus[],
  };
  engine.subscribe({
    onPhaseChange: (e) => log.phases.push(e),
    onTick: (e) => log.ticks.push(e),
    onComplete: (e) => log.completes.push(e),
    onStateChange: (s) => log.states.push(s.status),
  });
  return { clock, engine, log };
}

// classic-90 phase lengths: breathing 48s, grounding 30s, lines 15s = 93s.
const BREATHING_MS = 48_000;
const GROUNDING_MS = 30_000;
const LINES_MS = 15_000;
const CLASSIC_MS = BREATHING_MS + GROUNDING_MS + LINES_MS;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('full classic-90 run', () => {
  it('starts idle and does nothing until start()', () => {
    const { clock, engine, log } = harness();
    expect(engine.getState()).toEqual({ status: 'idle' });
    clock.advance(5_000);
    expect(log.ticks).toHaveLength(0);
    expect(clock.pendingFrames).toBe(0);
  });

  it('runs breathing → grounding → lines, then completes exactly once', () => {
    const { clock, engine, log } = harness();
    engine.start();
    clock.advance(CLASSIC_MS + 1_000);

    expect(log.phases.map((e) => [e.phaseIndex, e.phase.kind, e.reason])).toEqual([
      [0, 'breathing', 'start'],
      [1, 'grounding', 'elapsed'],
      [2, 'lines', 'elapsed'],
    ]);
    expect(log.completes).toEqual([{ protocolId: 'classic-90', completedAt: T0 + CLASSIC_MS, skippedPhases: 0 }]);
    expect(engine.getState()).toEqual({ status: 'completed' });
    expect(log.states).toEqual(['running', 'completed']);
    expect(clock.pendingFrames).toBe(0); // loop stopped
  });

  it('phase boundaries land on exact clock times despite jittery frames (no drift)', () => {
    const { clock, engine, log } = harness();
    engine.start();
    clock.advance(CLASSIC_MS + 1_000, jitter());

    expect(log.phases.map((e) => e.startedAt)).toEqual([T0, T0 + BREATHING_MS, T0 + BREATHING_MS + GROUNDING_MS]);
    expect(log.completes[0]?.completedAt).toBe(T0 + CLASSIC_MS);

    // Overshoot carries into the next phase instead of being dropped.
    const firstGroundingTick = log.ticks.find((t) => t.phaseIndex === 1);
    expect(firstGroundingTick?.phaseElapsedMs).toBe(firstGroundingTick && firstGroundingTick.at - (T0 + BREATHING_MS));
  });

  it('is not complete one frame before the end, and is on the frame at the end', () => {
    const { clock, engine, log } = harness();
    engine.start();
    clock.advance(CLASSIC_MS - 1);
    expect(log.completes).toHaveLength(0);
    expect(engine.getState().status).toBe('running');
    clock.advance(1);
    expect(log.completes).toHaveLength(1);
  });

  it('is deterministic: the same clock produces the same event log', () => {
    const run = () => {
      const { clock, engine, log } = harness();
      engine.start();
      clock.advance(CLASSIC_MS + 500, jitter());
      return log;
    };
    expect(run()).toEqual(run());
  });

  it('handles a hold-after-exhale protocol and a single-phase protocol', () => {
    const box = harness(boxBreathing);
    box.engine.start();
    box.clock.advance(64_000);
    expect(box.log.completes[0]?.completedAt).toBe(T0 + 64_000);

    const solo = harness(breathing60);
    solo.engine.start();
    solo.clock.advance(60_000);
    expect(solo.log.phases).toHaveLength(1);
    expect(solo.log.completes).toHaveLength(1);
  });

  it('start() is a no-op once running', () => {
    const { clock, engine, log } = harness();
    engine.start();
    clock.advance(1_000);
    engine.start();
    expect(log.phases).toHaveLength(1);
    expect(clock.pendingFrames).toBe(1);
  });
});

describe('tick progress', () => {
  it('is within 0..1 and monotonic within each phase, reaching 1 at the end of each', () => {
    const { clock, engine, log } = harness();
    engine.start();
    clock.advance(CLASSIC_MS + 1_000, jitter());

    for (const index of [0, 1, 2]) {
      const progress = log.ticks.filter((t) => t.phaseIndex === index).map((t) => t.progress);
      expect(progress.length).toBeGreaterThan(10);
      expect(progress[0]).toBeLessThan(0.01);
      expect(progress.at(-1)).toBe(1);
      for (let i = 1; i < progress.length; i++) {
        expect(progress[i]).toBeGreaterThanOrEqual(progress[i - 1] ?? 0);
      }
      expect(progress.every((p) => p >= 0 && p <= 1)).toBe(true);
    }
  });

  it('phase index never goes backwards during a run', () => {
    const { clock, engine, log } = harness();
    engine.start();
    clock.advance(CLASSIC_MS + 1_000, jitter());
    const indexes = log.ticks.map((t) => t.phaseIndex);
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
  });

  it('reports elapsed and duration in ms', () => {
    const { clock, engine, log } = harness();
    engine.start();
    clock.advance(12_000);
    expect(log.ticks.at(-1)).toMatchObject({ phaseIndex: 0, phaseElapsedMs: 12_000, phaseDurationMs: BREATHING_MS, progress: 0.25 });
  });
});

describe('skipPhase()', () => {
  it('jumps to the next phase immediately, timing it from the skip', () => {
    const { clock, engine, log } = harness();
    engine.start();
    clock.advance(5_000);
    engine.skipPhase();

    expect(log.phases.at(-1)).toMatchObject({ phaseIndex: 1, reason: 'skip', previousIndex: 0, startedAt: T0 + 5_000 });
    expect(engine.getState()).toMatchObject({ status: 'running', phaseIndex: 1, phaseElapsedMs: 0 });

    clock.advance(GROUNDING_MS);
    expect(log.phases.at(-1)).toMatchObject({ phaseIndex: 2, reason: 'elapsed', startedAt: T0 + 5_000 + GROUNDING_MS });
  });

  it('skipping the last phase completes the run and counts skips', () => {
    const { clock, engine, log } = harness();
    engine.start();
    engine.skipPhase();
    engine.skipPhase();
    clock.advance(1_000);
    engine.skipPhase();

    expect(log.completes).toEqual([{ protocolId: 'classic-90', completedAt: T0 + 1_000, skippedPhases: 3 }]);
    expect(engine.getState()).toEqual({ status: 'completed' });
    expect(clock.pendingFrames).toBe(0);
  });

  it('while paused, moves to the next phase and stays paused', () => {
    const { clock, engine } = harness();
    engine.start();
    clock.advance(5_000);
    engine.pause();
    engine.skipPhase();
    expect(engine.getState()).toEqual({ status: 'paused', phaseIndex: 1, phaseElapsedMs: 0, wasInterrupted: false });
    expect(clock.pendingFrames).toBe(0);
  });

  it('is a no-op when idle, completed or aborted', () => {
    const { clock, engine, log } = harness();
    engine.skipPhase();
    expect(engine.getState()).toEqual({ status: 'idle' });

    engine.start();
    engine.abort();
    engine.skipPhase();
    expect(engine.getState().status).toBe('aborted');

    engine.restart();
    clock.advance(CLASSIC_MS);
    engine.skipPhase();
    expect(log.completes).toHaveLength(1);
  });
});

describe('abort()', () => {
  it('stops all timers: no frames pending, no further events as time passes', () => {
    const { clock, engine, log } = harness();
    engine.start();
    clock.advance(10_000);
    engine.abort();

    expect(clock.pendingFrames).toBe(0);
    expect(engine.getState()).toEqual({ status: 'aborted', phaseIndex: 0, phaseElapsedMs: 10_000 });

    const before = { ...log, ticks: log.ticks.length, phases: log.phases.length };
    clock.advance(CLASSIC_MS * 2);
    clock.frame();
    expect(log.ticks).toHaveLength(before.ticks);
    expect(log.phases).toHaveLength(before.phases);
    expect(log.completes).toHaveLength(0);
  });

  it('works while paused and from idle, and blocks resume/skip afterwards', () => {
    const { clock, engine, log } = harness();
    engine.abort();
    expect(engine.getState().status).toBe('aborted');

    engine.restart();
    clock.advance(3_000);
    engine.pause();
    engine.abort();
    expect(engine.getState()).toMatchObject({ status: 'aborted', phaseElapsedMs: 3_000 });

    engine.resume();
    engine.skipPhase();
    clock.advance(CLASSIC_MS);
    expect(engine.getState().status).toBe('aborted');
    expect(log.completes).toHaveLength(0);
  });

  it('can be called from inside an event listener without the loop continuing', () => {
    const { clock, engine, log } = harness();
    engine.subscribe({ onPhaseChange: (e) => e.phaseIndex === 1 && engine.abort() });
    engine.start();
    clock.advance(CLASSIC_MS);
    expect(engine.getState()).toMatchObject({ status: 'aborted', phaseIndex: 1 });
    expect(log.ticks.some((t) => t.phaseIndex === 1 && t.progress > 0.5)).toBe(false);
    expect(clock.pendingFrames).toBe(0);
  });
});

describe('pause() / resume()', () => {
  it('freezes elapsed time while paused, then continues where it left off', () => {
    const { clock, engine, log } = harness();
    engine.start();
    clock.advance(10_000);
    engine.pause();
    expect(clock.pendingFrames).toBe(0);

    clock.sleep(60_000);
    expect(engine.getState()).toEqual({ status: 'paused', phaseIndex: 0, phaseElapsedMs: 10_000, wasInterrupted: false });

    engine.resume();
    clock.advance(BREATHING_MS - 10_000);
    expect(log.phases.at(-1)).toMatchObject({ phaseIndex: 1, startedAt: T0 + 10_000 + 60_000 + 38_000 });
  });
});

describe('interruption (page hidden mid-run)', () => {
  it('a time jump pauses the run and sets wasInterrupted — never silently continuing', () => {
    const { clock, engine, log } = harness();
    engine.start();
    clock.advance(10_000);
    clock.sleep(10_000); // tab hidden: no frames for 10s
    clock.frame(); // first frame on return

    expect(engine.wasInterrupted).toBe(true);
    expect(engine.getState()).toEqual({ status: 'paused', phaseIndex: 0, phaseElapsedMs: 10_000, wasInterrupted: true });
    expect(log.states.at(-1)).toBe('paused');
    expect(clock.pendingFrames).toBe(0);

    // Nothing moves while waiting for the user's choice.
    clock.sleep(120_000);
    expect(log.phases).toHaveLength(1);
    expect(log.completes).toHaveLength(0);
  });

  it('never loses the run: resume continues from the frozen point', () => {
    const { clock, engine, log } = harness();
    engine.start();
    clock.advance(40_000);
    clock.sleep(30_000);
    clock.frame();

    engine.resume();
    expect(engine.wasInterrupted).toBe(false);
    clock.advance(8_000);
    expect(log.phases.at(-1)).toMatchObject({ phaseIndex: 1, reason: 'elapsed' });
  });

  it('restart begins the protocol from the top', () => {
    const { clock, engine, log } = harness();
    engine.start();
    clock.advance(60_000); // into grounding
    clock.sleep(10_000);
    clock.frame();

    engine.restart();
    expect(engine.wasInterrupted).toBe(false);
    expect(log.phases.at(-1)).toMatchObject({ phaseIndex: 0, reason: 'restart', startedAt: clock.time });
    expect(engine.getState()).toMatchObject({ status: 'running', phaseIndex: 0, phaseElapsedMs: 0 });
  });

  it('default threshold tolerates a visible-page stall of a couple of seconds (slow phone, first load)', () => {
    const { clock, engine } = harness();
    engine.start();
    clock.advance(500);
    clock.sleep(1_650); // the stall seen in the browser right after first load
    clock.frame();
    clock.advance(1_000);
    clock.sleep(3_000);
    clock.frame();
    expect(engine.wasInterrupted).toBe(false);
    expect(engine.getState()).toMatchObject({ status: 'running', phaseElapsedMs: 6_150 });
  });

  it('ordinary frame jank below the threshold does not interrupt', () => {
    const { clock, engine } = harness(classic90, { interruptThresholdMs: 1_000 });
    engine.start();
    clock.advance(5_000);
    clock.sleep(900);
    clock.frame();
    expect(engine.wasInterrupted).toBe(false);
    expect(engine.getState()).toMatchObject({ status: 'running', phaseElapsedMs: 5_900 });
  });

  it('interrupt() pauses immediately (for a visibilitychange handler)', () => {
    const { clock, engine } = harness();
    engine.start();
    clock.advance(7_000);
    engine.interrupt();
    expect(engine.getState()).toEqual({ status: 'paused', phaseIndex: 0, phaseElapsedMs: 7_000, wasInterrupted: true });
    expect(clock.pendingFrames).toBe(0);
  });

  it('interrupt() does nothing when not running', () => {
    const { engine } = harness();
    engine.interrupt();
    expect(engine.getState()).toEqual({ status: 'idle' });
    expect(engine.wasInterrupted).toBe(false);
  });
});

describe('subscribe()', () => {
  it('returns an unsubscribe function', () => {
    const { clock, engine } = harness();
    const onTick = vi.fn();
    const unsubscribe = engine.subscribe({ onTick });
    engine.start();
    clock.advance(100);
    unsubscribe();
    const calls = onTick.mock.calls.length;
    clock.advance(1_000);
    expect(onTick).toHaveBeenCalledTimes(calls);
  });

  it('a throwing listener does not break the run or other listeners', () => {
    const errors: unknown[] = [];
    const { clock, engine, log } = harness(classic90, { onListenerError: (e) => errors.push(e) });
    engine.subscribe({
      onTick: () => {
        throw new Error('UI bug');
      },
    });
    engine.start();
    clock.advance(CLASSIC_MS);
    expect(log.completes).toHaveLength(1);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('dispose() stops the loop and silences listeners', () => {
    const { clock, engine, log } = harness();
    engine.start();
    clock.advance(1_000);
    const ticks = log.ticks.length;
    engine.dispose();
    clock.advance(CLASSIC_MS);
    expect(clock.pendingFrames).toBe(0);
    expect(log.ticks).toHaveLength(ticks);
  });
});

describe('construction', () => {
  it('rejects a protocol with no phases', () => {
    expect(() => createResetEngine({ ...classic90, phases: [] })).toThrow(/no phases/);
  });
});
