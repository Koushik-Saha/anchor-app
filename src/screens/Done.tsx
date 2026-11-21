import { useState } from 'react';
import { useNavigation } from '../app/navigation';
import { BottomBar } from '../components/BottomBar';
import { CalmButton } from '../components/CalmButton';
import { CrisisLine } from '../components/CrisisLine';
import { InstallHint } from '../components/InstallHint';
import { cx } from '../components/cx';
import { Screen } from '../components/Screen';
import { HELPED_OPTIONS } from '../content/format';
import type { ProtocolId } from '../content/protocols';
import * as haptics from '../platform/haptics';
import { storage, type Helped } from '../platform/storage';

interface DoneProps {
  protocolId: ProtocolId;
  /** Timestamp of the history entry Reset saved for this run. */
  completedAt: string;
}

export function Done({ protocolId, completedAt }: DoneProps) {
  const { navigate } = useNavigation();
  const [helped, setHelped] = useState<Helped | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'failed'>('idle');

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
          <CalmButton onClick={() => navigate({ view: 'reset', protocolId })}>Again</CalmButton>
          <CalmButton onClick={() => navigate('home')}>Home</CalmButton>
        </BottomBar>
      }
    >
      <div className="flex flex-1 flex-col justify-center gap-10 py-6">
        <h1 className="text-3xl leading-tight font-semibold tracking-tight text-ink">
          You did it.
          <span className="block text-muted">It always passes.</span>
        </h1>

        <section aria-labelledby="what-helped" className="flex flex-col gap-3">
          <h2 id="what-helped" className="text-lg text-ink">
            What helped?
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {HELPED_OPTIONS.map(({ value, label }) => (
              <CalmButton
                key={value}
                aria-pressed={helped === value}
                onClick={() => void answer(value)}
                className={cx('ring-2', helped === value ? 'text-ink ring-accent' : 'ring-transparent')}
              >
                {label}
              </CalmButton>
            ))}
          </div>
          <p aria-live="polite" className="min-h-6 text-sm text-muted">
            {saveState === 'saved' && 'Saved on this device only.'}
            {saveState === 'failed' && 'Couldn’t save on this device.'}
          </p>
        </section>

        {/* A calm moment after a reset — the best time to suggest it, never during one. */}
        <InstallHint />
      </div>

      <CrisisLine />
    </Screen>
  );
}
