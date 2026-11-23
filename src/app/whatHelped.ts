import { getProtocol } from '../content/protocols';
import type { HistoryEntry } from '../platform/storage';

/**
 * "What helped": plain counts and simple majorities over on-device history. Computed
 * when the screen opens and never stored. A statement exists only if the data supports it.
 */

/** No pattern claim from fewer recorded resets than this. */
export const MIN_RESETS = 3;
/** "…of your last 5 times" looks at this many answered resets. */
export const RECENT_ANSWERS = 5;

export type HelpedSubject = 'breathing' | 'grounding' | 'both';

export type WhatHelpedStatement =
  | { kind: 'helped'; subject: HelpedSubject; count: number; total: number }
  /** `hour` is local time, 0–23, rounded to the nearest hour. */
  | { kind: 'time'; hour: number }
  | { kind: 'most-used'; protocolId: string; name: string };

const isMajority = (count: number, total: number): boolean => count * 2 > total;

/** The value held by more than half of `values`, if there is one. */
export function majorityOf<T>(values: readonly T[]): { value: T; count: number } | null {
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  for (const [value, count] of counts) if (isMajority(count, values.length)) return { value, count };
  return null;
}

function helpedStatement(completed: readonly HistoryEntry[]): WhatHelpedStatement | null {
  const answers = completed.filter((e) => e.helped).slice(-RECENT_ANSWERS);
  if (answers.length < MIN_RESETS) return null;
  const total = answers.length;
  const breathing = answers.filter((e) => e.helped === 'breathing' || e.helped === 'both').length;
  const grounding = answers.filter((e) => e.helped === 'grounding' || e.helped === 'both').length;
  const count = Math.max(breathing, grounding);
  if (!isMajority(count, total)) return null;
  const subject: HelpedSubject = breathing === grounding ? 'both' : breathing > grounding ? 'breathing' : 'grounding';
  return { kind: 'helped', subject, count, total };
}

function nearestHour(iso: string): number | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return (date.getHours() + (date.getMinutes() >= 30 ? 1 : 0)) % 24;
}

function timeStatement(completed: readonly HistoryEntry[]): WhatHelpedStatement | null {
  const hours = completed.map((e) => nearestHour(e.at)).filter((h): h is number => h !== null);
  if (hours.length < MIN_RESETS) return null;
  const top = majorityOf(hours);
  return top ? { kind: 'time', hour: top.value } : null;
}

function mostUsedStatement(completed: readonly HistoryEntry[]): WhatHelpedStatement | null {
  if (completed.length < MIN_RESETS) return null;
  const top = majorityOf(completed.map((e) => e.protocolId));
  const name = top && getProtocol(top.value)?.name;
  return top && name ? { kind: 'most-used', protocolId: top.value, name } : null;
}

/** Only finished resets count. An empty list means: show the calm "not yet" line. */
export function whatHelpedStatements(history: readonly HistoryEntry[]): WhatHelpedStatement[] {
  const completed = history.filter((e) => e.completed);
  return [helpedStatement(completed), timeStatement(completed), mostUsedStatement(completed)].filter(
    (s): s is WhatHelpedStatement => s !== null,
  );
}

/** "11 pm", "12 am". */
export function formatHour(hour: number): string {
  return `${hour % 12 === 0 ? 12 : hour % 12} ${hour < 12 ? 'am' : 'pm'}`;
}

const SUBJECT: Readonly<Record<HelpedSubject, string>> = {
  breathing: 'Breathing',
  grounding: 'Grounding',
  both: 'Breathing and grounding',
};

export const NO_PATTERNS_YET = 'Finish a few resets and patterns will show up here.';

export function statementText(statement: WhatHelpedStatement): string {
  switch (statement.kind) {
    case 'helped':
      return `${SUBJECT[statement.subject]} helped ${statement.count} of your last ${statement.total} times.`;
    case 'time':
      return `You use Anchor most around ${formatHour(statement.hour)}.`;
    case 'most-used':
      return `${statement.name} is your most-used reset.`;
  }
}
