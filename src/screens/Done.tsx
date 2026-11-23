import { useState } from 'react';
import { useNavigation, type ResetId } from '../app/navigation';
import { useStrings } from '../app/settings';
import { callLabel, planOnDone } from '../app/plan';
import { getCachedPlan } from '../app/planStore';
import { BottomBar } from '../components/BottomBar';
import { CalmButton } from '../components/CalmButton';
import { CrisisLine } from '../components/CrisisLine';
import { InstallHint } from '../components/InstallHint';
import { cx, focusRing } from '../components/cx';
import { Screen } from '../components/Screen';
import { HELPED_VALUES } from '../content/format';
import * as haptics from '../platform/haptics';
import { storage, type Helped, type PanicPlan } from '../platform/storage';

interface DoneProps {
  protocolId: ResetId;
  /** Timestamp of the history entry Reset saved for this run. */
  completedAt: string;
}

export function Done({ protocolId, completedAt }: DoneProps) {
  const { navigate } = useNavigation();
  const s = useStrings();
  const [helped, setHelped] = useState<Helped | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'failed'>('idle');
  // My plan: their own note, and a one-tap call to their person (shown whenever they saved one).
  // Read from the startup cache so it's there on the first frame (no layout shift).
  const plan: PanicPlan | undefined = getCachedPlan();
  const { note, tel } = planOnDone(plan);

  // Optional, one tap. Tapping another option changes the answer.
  const answer = async (value: Helped) => {
    setHelped(value);
    haptics.pulse('tap');
    setSaveState((await storage.setHistoryHelped(completedAt, value)) ? 'saved' : 'failed');
  };

  return (
    <Screen
      bottom={
        <BottomBar>
          <CalmButton onClick={() => navigate({ view: 'reset', protocolId })}>{s.done.again}</CalmButton>
          <CalmButton onClick={() => navigate('home')}>{s.common.home}</CalmButton>
        </BottomBar>
      }
    >
      <div className="flex flex-1 flex-col justify-center gap-10 py-6">
        <h1 tabIndex={-1} className="text-3xl leading-tight font-semibold tracking-tight text-ink outline-none">
          {s.done.title}
          <span className="block text-muted">{s.done.subtitle}</span>
        </h1>

        {(note || tel) && (
          <div className="flex flex-col gap-4">
            {note && <p className="border-l-2 border-accent pl-4 text-xl leading-snug text-ink [overflow-wrap:anywhere]">{note}</p>}
            {tel && (
              <a
                href={tel}
                className={cx(
                  'flex min-h-tap items-center justify-center gap-3 rounded-2xl bg-surface px-5 py-3 text-center text-lg font-medium text-ink [overflow-wrap:anywhere] active:bg-surface/70',
                  focusRing,
                )}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 text-accent" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
                </svg>
                {callLabel(plan, s)}
              </a>
            )}
          </div>
        )}

        <section aria-labelledby="what-helped" className="flex flex-col gap-3">
          <h2 id="what-helped" className="text-lg text-ink">
            {s.done.whatHelped}
          </h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-3">
            {HELPED_VALUES.map((value) => (
              <CalmButton
                key={value}
                aria-pressed={helped === value}
                onClick={() => void answer(value)}
                className={cx('ring-2', helped === value ? 'text-ink ring-accent' : 'ring-transparent')}
              >
                {s.helped[value]}
              </CalmButton>
            ))}
          </div>
          <p aria-live="polite" className="min-h-6 text-sm text-muted">
            {saveState === 'saved' && s.common.savedOnDevice}
            {saveState === 'failed' && s.common.saveFailed}
          </p>
        </section>

        {/* A calm moment after a reset — the best time to suggest it, never during one. */}
        <InstallHint />
      </div>

      <CrisisLine />
    </Screen>
  );
}
