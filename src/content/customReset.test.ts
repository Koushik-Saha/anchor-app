import { beforeEach, describe, expect, it } from 'vitest';
import { canLeaveSteps, nextStage, previousStage, stagesFor, toggleStep } from '../app/builder';
import { deleteCustomReset, getCachedCustomReset, loadCustomReset, resolveProtocol, saveCustomReset } from '../app/customResetStore';
import { whatHelpedStatements } from '../app/whatHelped';
import { createResetEngine, protocolDurationSec, validateProtocol, type FrameScheduler, type Protocol } from '../engine';
import {
  createMemoryBackend,
  createStorage,
  CUSTOM_NAME_MAX,
  normalizeCustomReset,
  normalizeHistory,
  setStorageBackend,
  storage,
  type CustomReset,
} from '../platform/storage';
import { BREATH_PATTERNS } from './breathPatterns';
import { CUSTOM_RESET_ID, customProtocol } from './customReset';
import { classic90, groundingOnly, protocols } from './protocols';

const full: CustomReset = { name: 'Bus stop', steps: ['grounding', 'breathing', 'lines'], patternId: 'box', breathSec: 60, linesLength: 'short' };
const SOURCES = import.meta.glob('../**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true });

function runToEnd(protocol: Protocol) {
  let t = 1_000;
  const frames: (() => void)[] = [];
  const scheduler: FrameScheduler = {
    request(cb) {
      frames.push(cb);
      return () => void frames.splice(frames.indexOf(cb), 1);
    },
  };
  const engine = createResetEngine(protocol, { now: () => t, scheduler });
  const kinds: string[] = [];
  let completed = false;
  engine.subscribe({
    onPhaseChange: (e) => void kinds.push(protocol.phases[e.phaseIndex]?.kind ?? '?'),
    onComplete: () => void (completed = true),
  });
  engine.start();
  const end = t + protocolDurationSec(protocol) * 1000 + 100;
  while (t < end && !completed) {
    t += 16;
    frames.splice(0).forEach((f) => f());
  }
  return { kinds, completed };
}

describe('building the protocol', () => {
  it('keeps the chosen order and is a valid protocol', () => {
    const p = customProtocol(full);
    expect(p.phases.map((ph) => ph.kind)).toEqual(['grounding', 'breathing', 'lines']);
    expect(validateProtocol(p)).toEqual([]);
    expect(p.id).toBe(CUSTOM_RESET_ID);
    expect(p.name).toBe('Bus stop');
    expect(p.noTones).toBeUndefined();
  });

  it.each(BREATH_PATTERNS.flatMap((pattern) => [30, 60, 90].map((sec) => [pattern.id, sec] as const)))(
    '%s for %is breathes close to that length, in whole breaths',
    (patternId, breathSec) => {
      const p = customProtocol({ ...full, steps: ['breathing'], patternId, breathSec: breathSec as 30 | 60 | 90 });
      const phase = p.phases[0];
      expect(phase?.kind === 'breathing' && Number.isInteger(phase.cycles)).toBe(true);
      expect(Math.abs(protocolDurationSec(p) - breathSec)).toBeLessThanOrEqual(10);
    },
  );

  it('reuses the built-in grounding and calm lines', () => {
    expect(customProtocol({ ...full, steps: ['breathing', 'grounding'] }).phases[1]).toBe(groundingOnly.phases[0]);
    expect(customProtocol({ ...full, steps: ['breathing', 'lines'], linesLength: 'short' }).phases[1]).toBe(groundingOnly.phases[1]);
    expect(customProtocol({ ...full, steps: ['breathing', 'lines'], linesLength: 'standard' }).phases[1]).toBe(classic90.phases[2]);
  });

  it('leaves the built-ins untouched', () => {
    expect(protocols.map((p) => p.id)).not.toContain(CUSTOM_RESET_ID);
    expect(protocols).toHaveLength(6);
  });
});

describe('builder flow', () => {
  it('adds steps in tap order and removes on a second tap', () => {
    expect(toggleStep(toggleStep([], 'lines'), 'breathing')).toEqual(['lines', 'breathing']);
    expect(toggleStep(['lines', 'breathing'], 'lines')).toEqual(['breathing']);
  });

  it('breathing is required', () => {
    expect(canLeaveSteps([])).toBe(false);
    expect(canLeaveSteps(['grounding', 'lines'])).toBe(false);
    expect(canLeaveSteps(['grounding', 'breathing'])).toBe(true);
  });

  it('asks for a lines length only when calm lines are included', () => {
    expect(stagesFor(['breathing'])).toEqual(['steps', 'pattern', 'breath-length', 'name']);
    expect(stagesFor(['breathing', 'lines'])).toEqual(['steps', 'pattern', 'breath-length', 'lines-length', 'name']);
  });

  it('moves forward and back', () => {
    expect(nextStage('breath-length', ['breathing'])).toBe('name');
    expect(nextStage('breath-length', ['breathing', 'lines'])).toBe('lines-length');
    expect(previousStage('name', ['breathing'])).toBe('breath-length');
    expect(previousStage('steps', ['breathing'])).toBeNull();
  });
});

describe('saving, loading and deleting (on-device)', () => {
  beforeEach(async () => {
    setStorageBackend(createMemoryBackend());
    await loadCustomReset();
  });

  it('saves and loads after a restart', async () => {
    expect(await saveCustomReset(full)).toBe(true);
    await loadCustomReset();
    expect(getCachedCustomReset()).toEqual(full);
    expect(resolveProtocol(CUSTOM_RESET_ID)?.name).toBe('Bus stop');
  });

  it('a blank name becomes "My reset"; long names are cut', async () => {
    await saveCustomReset({ ...full, name: '   ' });
    expect(getCachedCustomReset()?.name).toBe('My reset');
    await saveCustomReset({ ...full, name: 'x'.repeat(99) });
    expect(getCachedCustomReset()?.name).toHaveLength(CUSTOM_NAME_MAX);
  });

  it('deleting removes it and leaves built-ins and settings alone', async () => {
    await storage.saveSettings({ ...(await storage.getSettings()), largeText: true });
    await saveCustomReset(full);
    await deleteCustomReset();
    expect(getCachedCustomReset()).toBeUndefined();
    expect(await storage.getCustomReset()).toBeUndefined();
    expect(resolveProtocol(CUSTOM_RESET_ID)).toBeUndefined();
    expect(resolveProtocol('classic-90')?.id).toBe('classic-90');
    expect((await storage.getSettings()).largeText).toBe(true);
  });

  it('runs end to end in the shared engine', async () => {
    await saveCustomReset(full);
    const protocol = resolveProtocol(CUSTOM_RESET_ID);
    if (!protocol) throw new Error('missing');
    const { kinds, completed } = runToEnd(protocol);
    expect(completed).toBe(true);
    expect(kinds).toEqual(['grounding', 'breathing', 'lines']);
  });

  it('there is only one player: nothing but Reset creates an engine', () => {
    const users = Object.entries(SOURCES)
      .filter(([path]) => !/\.test\.tsx?$/.test(path) && !path.includes('/engine/'))
      .filter(([, text]) => String(text).includes('createResetEngine('))
      .map(([path]) => path);
    expect(users).toEqual(['../screens/Reset.tsx']);
    expect(String(SOURCES['../screens/Reset.tsx'])).toContain('resolveProtocol(protocolId)');
  });
});

describe('history records it by name', () => {
  it('keeps the name, including the "what helped" answer, after it is deleted', async () => {
    const backend = createMemoryBackend();
    const s = createStorage(backend);
    const at = '2026-11-20T10:00:00.000Z';
    await s.addHistoryEntry({ at, protocolId: CUSTOM_RESET_ID, protocolName: 'Bus stop', completed: true });
    await s.setHistoryHelped(at, 'grounding');
    expect(await createStorage(backend).getHistory()).toEqual([
      { at, protocolId: CUSTOM_RESET_ID, protocolName: 'Bus stop', completed: true, helped: 'grounding' },
    ]);
  });

  it('old entries with no name still read the same', () => {
    const old = { at: 'x', protocolId: 'classic-90', completed: true };
    expect(normalizeHistory([old])).toEqual([old]);
    expect(normalizeHistory([{ ...old, protocolName: 5 }])).toEqual([old]);
  });

  it('"What helped" names the custom reset', () => {
    const history = [1, 2, 3].map((day) => ({
      at: new Date(2026, 10, day, day * 6).toISOString(),
      protocolId: CUSTOM_RESET_ID,
      protocolName: 'Bus stop',
      completed: true,
    }));
    expect(whatHelpedStatements(history)).toContainEqual({ kind: 'most-used', protocolId: CUSTOM_RESET_ID, name: 'Bus stop' });
  });
});

describe('stored data is untrusted', () => {
  it('keeps a valid custom reset', () => {
    expect(normalizeCustomReset(full)).toEqual(full);
  });

  it.each([
    ['not an object', 'x'],
    ['no breathing', { ...full, steps: ['grounding'] }],
    ['repeated step', { ...full, steps: ['breathing', 'breathing'] }],
    ['unknown step', { ...full, steps: ['breathing', 'dance'] }],
    ['bad length', { ...full, breathSec: 45 }],
    ['bad lines length', { ...full, linesLength: 'long' }],
  ])('rejects %s', (_name, raw) => {
    expect(normalizeCustomReset(raw)).toBeUndefined();
  });
});
