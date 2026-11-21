import type { BreathingPhase, Phase, Protocol } from './types';

/** Seconds for one full breathing cycle (inhale + hold + exhale + hold-out). */
export function breathingCycleSec(
  phase: Pick<BreathingPhase, 'inhaleSec' | 'holdSec' | 'exhaleSec' | 'holdOutSec'>,
): number {
  return phase.inhaleSec + phase.holdSec + phase.exhaleSec + (phase.holdOutSec ?? 0);
}

export function phaseDurationSec(phase: Phase): number {
  switch (phase.kind) {
    case 'breathing':
      return phase.cycles * breathingCycleSec(phase);
    case 'grounding':
      return phase.steps.length * phase.secPerStep;
    case 'lines':
      return phase.lines.length * phase.secPerLine;
  }
}

/** Total scripted duration of a protocol, in seconds. */
export function protocolDurationSec(protocol: Pick<Protocol, 'phases'>): number {
  return protocol.phases.reduce((total, phase) => total + phaseDurationSec(phase), 0);
}
