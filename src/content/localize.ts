import type { Phase, Protocol } from '../engine';
import { en, protocolText, type Strings } from './strings';

/** Protocol data holds the English lines; this finds each line's key in the table. */
const CALM_KEY_BY_LINE = new Map(
  (Object.entries(en.calm) as [keyof Strings['calm'], string][]).map(([key, line]) => [line, key]),
);

function localizePhase(phase: Phase, s: Strings): Phase {
  switch (phase.kind) {
    case 'breathing':
      return phase;
    case 'grounding':
      return { ...phase, steps: phase.steps.map((step) => ({ ...step, prompt: s.grounding[step.sense] })) };
    case 'lines':
      return {
        ...phase,
        lines: phase.lines.map((line) => {
          const key = CALM_KEY_BY_LINE.get(line);
          return key ? s.calm[key] : line;
        }),
      };
  }
}

/** The same protocol, same timing, with its words in the person's language. */
export function localizeProtocol(protocol: Protocol, s: Strings): Protocol {
  const text = protocolText(s, protocol.id);
  return {
    ...protocol,
    name: text?.name ?? protocol.name,
    description: text?.description ?? protocol.description,
    phases: protocol.phases.map((phase) => localizePhase(phase, s)),
  };
}
