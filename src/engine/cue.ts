/**
 * What to show at a moment inside a phase. Pure: (phase, elapsedMs) → cue.
 * The Reset screen renders cues; it never does its own timing.
 */
import { breathingCycleSec } from './duration';
import type { BreathingPhase, GroundingPhase, GroundingStep, LinesPhase, Phase } from './types';

export type BreathPart = 'inhale' | 'topUp' | 'hold' | 'exhale' | 'holdOut';

export type Cue =
  | {
      kind: 'breathing';
      /** 0-based cycle. */
      cycle: number;
      cycles: number;
      part: BreathPart;
      /** 0..1 within the current part. */
      partProgress: number;
      /**
       * Lung fullness 0..1: eased up on inhale, 1 on hold, eased down on exhale, 0 on hold-out.
       * With a top-up, the inhale eases up to TOP_UP_FROM and the top-up eases the rest of the way.
       */
      level: number;
    }
  | { kind: 'grounding'; stepIndex: number; step: GroundingStep }
  | { kind: 'lines'; lineIndex: number; line: string };

const clamp01 = (n: number): number => Math.min(Math.max(n, 0), 1);

/** Where the first inhale stops when a top-up follows: the top-up is the last, small grow. */
export const TOP_UP_FROM = 0.8;

/** Sine ease-in-out: slow at the turns, like a natural breath. */
export const easeInOut = (p: number): number => (1 - Math.cos(Math.PI * clamp01(p))) / 2;

function breathingCue(phase: BreathingPhase, elapsedMs: number): Cue {
  const cycleMs = breathingCycleSec(phase) * 1000;
  const t = Math.min(Math.max(elapsedMs, 0), cycleMs * phase.cycles);
  const cycle = Math.min(Math.floor(t / cycleMs), phase.cycles - 1);
  let within = t - cycle * cycleMs;

  const parts = (
    [
      ['inhale', phase.inhaleSec],
      ['topUp', phase.topUpSec ?? 0],
      ['hold', phase.holdSec],
      ['exhale', phase.exhaleSec],
      ['holdOut', phase.holdOutSec ?? 0],
    ] as const
  ).filter(([, sec]) => sec > 0);

  const inhaleTop = (phase.topUpSec ?? 0) > 0 ? TOP_UP_FROM : 1;
  const levelOf = (part: BreathPart, p: number): number => {
    switch (part) {
      case 'inhale':
        return inhaleTop * easeInOut(p);
      case 'topUp':
        return TOP_UP_FROM + (1 - TOP_UP_FROM) * easeInOut(p);
      case 'hold':
        return 1;
      case 'exhale':
        return 1 - easeInOut(p);
      case 'holdOut':
        return 0;
    }
  };

  for (let i = 0; i < parts.length; i++) {
    const [part, sec] = parts[i] ?? ['inhale', 1];
    const partMs = sec * 1000;
    const isLast = i === parts.length - 1;
    if (within < partMs || isLast) {
      const partProgress = clamp01(within / partMs);
      const level = levelOf(part, partProgress);
      return { kind: 'breathing', cycle, cycles: phase.cycles, part, partProgress, level };
    }
    within -= partMs;
  }
  // Unreachable: the last part always matches.
  return { kind: 'breathing', cycle, cycles: phase.cycles, part: 'inhale', partProgress: 0, level: 0 };
}

function indexAt(elapsedMs: number, secPerItem: number, count: number): number {
  return Math.min(Math.max(Math.floor(elapsedMs / (secPerItem * 1000)), 0), count - 1);
}

function groundingCue(phase: GroundingPhase, elapsedMs: number): Cue {
  const stepIndex = indexAt(elapsedMs, phase.secPerStep, phase.steps.length);
  const step = phase.steps[stepIndex];
  if (!step) throw new Error('Grounding phase has no steps');
  return { kind: 'grounding', stepIndex, step };
}

function linesCue(phase: LinesPhase, elapsedMs: number): Cue {
  const lineIndex = indexAt(elapsedMs, phase.secPerLine, phase.lines.length);
  return { kind: 'lines', lineIndex, line: phase.lines[lineIndex] ?? '' };
}

export function cueAt(phase: Phase, elapsedMs: number): Cue {
  switch (phase.kind) {
    case 'breathing':
      return breathingCue(phase, elapsedMs);
    case 'grounding':
      return groundingCue(phase, elapsedMs);
    case 'lines':
      return linesCue(phase, elapsedMs);
  }
}
