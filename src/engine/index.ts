// Reset engine: pure TypeScript, no React, no platform APIs.
export type * from './types';
export { breathingCycleSec, phaseDurationSec, protocolDurationSec } from './duration';
export { validateProtocol } from './validate';
export { cueAt, easeInOut } from './cue';
export type { BreathPart, Cue } from './cue';
export { createResetEngine, DEFAULT_INTERRUPT_THRESHOLD_MS } from './resetEngine';
export type {
  CompleteEvent,
  EngineListener,
  EngineOptions,
  EngineState,
  EngineStatus,
  FrameScheduler,
  PhaseChangeEvent,
  ResetEngine,
  TickEvent,
} from './resetEngine';
