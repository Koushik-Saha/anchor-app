import { useEffect, useState } from 'react';
import { useNavigation } from '../app/navigation';
import { syncUnlockWithStore, useUnlocked } from '../app/unlock';
import { BottomBar } from '../components/BottomBar';
import { CalmButton } from '../components/CalmButton';
import { cx, focusRing } from '../components/cx';
import { Screen } from '../components/Screen';
import { ScreenTitle } from '../components/ScreenTitle';
import { Sheet } from '../components/Sheet';
import { UnlockPanel } from '../components/UnlockPanel';
import { formatDuration } from '../content/format';
import { protocols } from '../content/protocols';
import type { Protocol } from '../engine';
import * as audio from '../platform/audio';

type LibraryProtocol = (typeof protocols)[number];

function LockBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-canvas px-2 py-0.5 text-xs text-muted">
      <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="7" width="10" height="7" rx="1.5" />
        <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
      </svg>
      Unlock
    </span>
  );
}

function ProtocolCard({ protocol, locked, onSelect }: { protocol: Protocol; locked: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${protocol.name}, ${formatDuration(protocol.approxSeconds)}${locked ? ', part of the unlock' : ''}`}
      className={cx(
        'flex min-h-tap w-full flex-col gap-1 rounded-2xl bg-surface px-5 py-4 text-left active:bg-surface/70',
        focusRing,
      )}
    >
      <span className="flex w-full items-baseline justify-between gap-3">
        <span className={cx('text-lg font-medium', locked ? 'text-ink/80' : 'text-ink')}>{protocol.name}</span>
        <span className="shrink-0 text-sm text-muted">{formatDuration(protocol.approxSeconds)}</span>
      </span>
      <span className="text-sm text-muted">{protocol.description}</span>
      {locked && (
        <span className="mt-1">
          <LockBadge />
        </span>
      )}
    </button>
  );
}

export function Library() {
  const { navigate } = useNavigation();
  const unlocked = useUnlocked();
  const [lockedChoice, setLockedChoice] = useState<LibraryProtocol | null>(null);

  // Silent store check (no prompts): picks up a purchase from another install, e.g. after reinstalling.
  useEffect(() => {
    void syncUnlockWithStore();
  }, []);

  const start = (protocol: LibraryProtocol) => {
    audio.prime(); // this tap unlocks sound for the reset's timed tones (iOS)
    navigate({ view: 'reset', protocolId: protocol.id });
  };

  const select = (protocol: LibraryProtocol) => {
    if (protocol.locked && !unlocked) setLockedChoice(protocol);
    else start(protocol);
  };

  const free = protocols.filter((p) => !p.locked);
  const extra = protocols.filter((p) => p.locked);

  return (
    <Screen
      bottom={
        <BottomBar>
          <CalmButton onClick={() => navigate('home')}>Home</CalmButton>
        </BottomBar>
      }
    >
      <ScreenTitle>Library</ScreenTitle>

      <section aria-labelledby="free-heading" className="flex flex-col gap-3">
        <h2 id="free-heading" className="text-sm font-medium tracking-wide text-muted uppercase">
          Free
        </h2>
        {free.map((p) => (
          <ProtocolCard key={p.id} protocol={p} locked={false} onSelect={() => select(p)} />
        ))}
      </section>

      <section aria-labelledby="unlock-heading" className="mt-8 flex flex-col gap-3">
        <h2 id="unlock-heading" className="text-sm font-medium tracking-wide text-muted uppercase">
          {unlocked ? 'Unlocked' : 'One-time unlock'}
        </h2>
        {extra.map((p) => (
          <ProtocolCard key={p.id} protocol={p} locked={!unlocked} onSelect={() => select(p)} />
        ))}
      </section>

      <Sheet open={lockedChoice !== null} onClose={() => setLockedChoice(null)} labelledBy="unlock-sheet-title">
        <h2 id="unlock-sheet-title" className="text-2xl font-semibold text-ink">
          {lockedChoice?.name}
        </h2>
        {lockedChoice && (
          <UnlockPanel doneLabel={`Start ${lockedChoice.name}`} onDone={() => start(lockedChoice)} />
        )}
        <CalmButton variant="quiet" onClick={() => setLockedChoice(null)}>
          Not now
        </CalmButton>
      </Sheet>
    </Screen>
  );
}
