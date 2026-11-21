/**
 * Reset engine: a framework-free state machine that runs one Protocol.
 *
 *   idle ──start──▶ running ──(last phase ends / skipped)──▶ completed
 *                    │  ▲
 *        pause /     │  │ resume
 *        interrupt / ▼  │
 *        time jump  paused ──restart──▶ running (phase 0)
 *
 *   abort() from idle / running / paused ──▶ aborted.  restart() works from any state.
 *
 * Timing: driven by animation frames, but elapsed time is always computed as
 * `clock() - phaseStartedAt` from a monotonic clock — never by summing frame
 * deltas — and phase boundaries carry their overshoot into the next phase. So
 * frame jitter or dropped frames never accumulate into drift.
 *
 * Interruptions: browsers stop animation frames while a page is hidden. If the
 * gap between two frames exceeds `interruptThresholdMs`, the run is paused at
 * the last moment the user actually saw, with `wasInterrupted = true`, so the
 * UI can offer resume-or-restart. The UI should also call `interrupt()` on
 * `visibilitychange` → hidden, which catches it immediately.
 *
 * Deterministic: the clock and frame scheduler are injected; the same inputs
 * always produce the same events.
 */
import { phaseDurationSec } from './duration';
import type { Phase, Protocol } from './types';

// ─── Public types ────────────────────────────────────────────────────────────

export type EngineStatus = 'idle' | 'running' | 'paused' | 'completed' | 'aborted';

export type EngineState =
  | { status: 'idle' }
  | { status: 'running'; phaseIndex: number; phaseElapsedMs: number }
  | { status: 'paused'; phaseIndex: number; phaseElapsedMs: number; wasInterrupted: boolean }
  | { status: 'completed' }
  | { status: 'aborted'; phaseIndex: number; phaseElapsedMs: number };

export interface PhaseChangeEvent {
  phaseIndex: number;
  previousIndex: number | null;
  phase: Phase;
  /** Clock time the phase began — the exact scheduled boundary when it followed on naturally. */
  startedAt: number;
  reason: 'start' | 'elapsed' | 'skip' | 'restart';
}

export interface TickEvent {
  /** Clock time of this frame. */
  at: number;
  phaseIndex: number;
  phase: Phase;
  phaseElapsedMs: number;
  phaseDurationMs: number;
  /** 0..1 within the current phase; reaches exactly 1 when a phase runs to its end. */
  progress: number;
}

export interface CompleteEvent {
  protocolId: string;
  /** Exact scheduled end when the run finished naturally; the skip time otherwise. */
  completedAt: number;
  /** How many phases were skipped — lets history distinguish a full run. */
  skippedPhases: number;
}

export interface EngineListener {
  onPhaseChange?(event: PhaseChangeEvent): void;
  onTick?(event: TickEvent): void;
  onComplete?(event: CompleteEvent): void;
  onStateChange?(state: EngineState): void;
}

export interface FrameScheduler {
  /** Run `callback` on the next frame. Returns a function that cancels it. */
  request(callback: () => void): () => void;
}

export interface EngineOptions {
  /** Monotonic clock in ms. Default: performance.now. */
  now?: () => number;
  /** Default: requestAnimationFrame (setTimeout ~60fps where unavailable). */
  scheduler?: FrameScheduler;
  /** A gap between frames longer than this counts as an interruption. Default 5000ms. */
  interruptThresholdMs?: number;
  /** Called when a listener throws. Default: rethrow asynchronously so the run is never broken. */
  onListenerError?: (error: unknown) => void;
}

export interface ResetEngine {
  readonly protocol: Protocol;
  /** True while paused because the run was interrupted (page hidden / time jump). */
  readonly wasInterrupted: boolean;
  getState(): EngineState;
  subscribe(listener: EngineListener): () => void;
  start(): void;
  pause(): void;
  resume(): void;
  /** Start again from phase 0, from any state. */
  restart(): void;
  skipPhase(): void;
  abort(): void;
  /** Pause because the page was hidden; sets wasInterrupted. */
  interrupt(): void;
  /** Stop the loop and drop all listeners. */
  dispose(): void;
}

/**
 * Frame gaps longer than this count as an interruption. Deliberately generous:
 * a hidden page is caught immediately by the UI calling interrupt() on
 * visibilitychange; this is only the fallback for a device that slept with JS
 * frozen (many seconds). Visible-page stalls of 1–2s happen on slow phones and
 * must NOT be mistaken for the user leaving.
 */
export const DEFAULT_INTERRUPT_THRESHOLD_MS = 5_000;

// ─── Defaults ────────────────────────────────────────────────────────────────

const defaultNow = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function defaultScheduler(): FrameScheduler {
  if (typeof requestAnimationFrame === 'function') {
    return {
      request(callback) {
        const id = requestAnimationFrame(() => callback());
        return () => cancelAnimationFrame(id);
      },
    };
  }
  return {
    request(callback) {
      const id = setTimeout(callback, 16);
      return () => clearTimeout(id);
    },
  };
}

const rethrowAsync = (error: unknown): void => {
  queueMicrotask(() => {
    throw error;
  });
};

// ─── Engine ──────────────────────────────────────────────────────────────────

export function createResetEngine(protocol: Protocol, options: EngineOptions = {}): ResetEngine {
  if (protocol.phases.length === 0) throw new Error(`Protocol "${protocol.id}" has no phases`);

  const now = options.now ?? defaultNow;
  const scheduler = options.scheduler ?? defaultScheduler();
  const interruptThresholdMs = options.interruptThresholdMs ?? DEFAULT_INTERRUPT_THRESHOLD_MS;
  const onListenerError = options.onListenerError ?? rethrowAsync;

  const phases = protocol.phases;
  const durationsMs = phases.map((p) => phaseDurationSec(p) * 1000);
  const lastIndex = phases.length - 1;
  const listeners = new Set<EngineListener>();

  let status: EngineStatus = 'idle';
  let phaseIndex = 0;
  /** Clock time the current phase began (meaningful while running). */
  let phaseStartedAt = 0;
  /** Phase elapsed time while paused / aborted. */
  let frozenElapsedMs = 0;
  let lastFrameAt = 0;
  let interrupted = false;
  let skippedPhases = 0;
  let cancelFrame: (() => void) | null = null;

  const phaseAt = (i: number): Phase => {
    const phase = phases[i];
    if (!phase) throw new Error(`No phase at index ${i}`);
    return phase;
  };
  const durationAt = (i: number): number => durationsMs[i] ?? 0;
  const clampElapsed = (ms: number): number => Math.min(Math.max(ms, 0), durationAt(phaseIndex));

  // ── Emitting ──

  const notify = (call: (listener: EngineListener) => void): void => {
    for (const listener of [...listeners]) {
      try {
        call(listener);
      } catch (error) {
        onListenerError(error);
      }
    }
  };

  const getState = (): EngineState => {
    switch (status) {
      case 'idle':
      case 'completed':
        return { status };
      case 'running':
        return { status, phaseIndex, phaseElapsedMs: clampElapsed(now() - phaseStartedAt) };
      case 'paused':
        return { status, phaseIndex, phaseElapsedMs: frozenElapsedMs, wasInterrupted: interrupted };
      case 'aborted':
        return { status, phaseIndex, phaseElapsedMs: frozenElapsedMs };
    }
  };

  const emitState = (): void => {
    const state = getState();
    notify((l) => l.onStateChange?.(state));
  };

  const emitTick = (at: number, elapsedMs: number): void => {
    const phaseDurationMs = durationAt(phaseIndex);
    const phaseElapsedMs = clampElapsed(elapsedMs);
    const event: TickEvent = {
      at,
      phaseIndex,
      phase: phaseAt(phaseIndex),
      phaseElapsedMs,
      phaseDurationMs,
      progress: phaseDurationMs > 0 ? phaseElapsedMs / phaseDurationMs : 1,
    };
    notify((l) => l.onTick?.(event));
  };

  const enterPhase = (index: number, startedAt: number, reason: PhaseChangeEvent['reason']): void => {
    const previousIndex = reason === 'start' || reason === 'restart' ? null : phaseIndex;
    phaseIndex = index;
    phaseStartedAt = startedAt;
    frozenElapsedMs = 0;
    const event: PhaseChangeEvent = { phaseIndex: index, previousIndex, phase: phaseAt(index), startedAt, reason };
    notify((l) => l.onPhaseChange?.(event));
  };

  // ── Frame loop ──

  const stopLoop = (): void => {
    cancelFrame?.();
    cancelFrame = null;
  };

  const scheduleFrame = (): void => {
    if (cancelFrame) return;
    cancelFrame = scheduler.request(onFrame);
  };

  const complete = (completedAt: number): void => {
    stopLoop();
    status = 'completed';
    interrupted = false;
    emitState();
    const event: CompleteEvent = { protocolId: protocol.id, completedAt, skippedPhases };
    notify((l) => l.onComplete?.(event));
  };

  /** Bring the run up to clock time `t`, crossing as many phase boundaries as it covers. */
  const advanceTo = (t: number): void => {
    while (status === 'running') {
      const duration = durationAt(phaseIndex);
      const elapsed = t - phaseStartedAt;
      if (elapsed < duration) {
        emitTick(t, elapsed);
        return;
      }
      emitTick(t, duration); // progress exactly 1
      if (status !== 'running') return;

      const boundary = phaseStartedAt + duration; // carry overshoot: no drift
      if (phaseIndex === lastIndex) {
        complete(boundary);
        return;
      }
      enterPhase(phaseIndex + 1, boundary, 'elapsed');
    }
  };

  function onFrame(): void {
    cancelFrame = null;
    if (status !== 'running') return;

    const t = now();
    if (t - lastFrameAt > interruptThresholdMs) {
      // Frames stopped (page hidden, phone locked). Freeze at the last moment the
      // user actually saw and ask them — never silently jump ahead.
      frozenElapsedMs = clampElapsed(lastFrameAt - phaseStartedAt);
      status = 'paused';
      interrupted = true;
      emitState();
      return;
    }

    lastFrameAt = t;
    advanceTo(t);
    if (status === 'running') scheduleFrame();
  }

  /** Begin running from phase 0 (used by start and restart). */
  const runFromTop = (reason: 'start' | 'restart'): void => {
    stopLoop();
    const t = now();
    status = 'running';
    interrupted = false;
    skippedPhases = 0;
    lastFrameAt = t;
    phaseIndex = 0;
    phaseStartedAt = t;
    emitState();
    if (status !== 'running') return;
    enterPhase(0, t, reason);
    if (status !== 'running') return;
    emitTick(t, 0);
    if (status === 'running') scheduleFrame();
  };

  /** running → paused. */
  const freeze = (asInterruption: boolean): void => {
    frozenElapsedMs = clampElapsed(now() - phaseStartedAt);
    stopLoop();
    status = 'paused';
    interrupted = asInterruption;
    emitState();
  };

  // ── Public API ──

  return {
    protocol,

    get wasInterrupted() {
      return status === 'paused' && interrupted;
    },

    getState,

    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },

    start() {
      if (status === 'idle') runFromTop('start');
    },

    restart() {
      runFromTop('restart');
    },

    pause() {
      if (status === 'running') freeze(false);
    },

    interrupt() {
      if (status === 'running') freeze(true);
    },

    resume() {
      if (status !== 'paused') return;
      const t = now();
      phaseStartedAt = t - frozenElapsedMs;
      lastFrameAt = t;
      status = 'running';
      interrupted = false;
      emitState();
      if (status === 'running') scheduleFrame();
    },

    skipPhase() {
      if (status !== 'running' && status !== 'paused') return;
      skippedPhases += 1;
      const t = now();
      if (phaseIndex === lastIndex) {
        complete(t);
        return;
      }
      const wasRunning = status === 'running';
      enterPhase(phaseIndex + 1, t, 'skip');
      if (wasRunning && status === 'running') {
        lastFrameAt = t;
        emitTick(t, 0);
      }
    },

    abort() {
      if (status === 'completed' || status === 'aborted') return;
      frozenElapsedMs = status === 'running' ? clampElapsed(now() - phaseStartedAt) : status === 'idle' ? 0 : frozenElapsedMs;
      stopLoop();
      status = 'aborted';
      interrupted = false;
      emitState();
    },

    dispose() {
      listeners.clear();
      stopLoop();
      if (status === 'running' || status === 'paused') status = 'aborted';
    },
  };
}
