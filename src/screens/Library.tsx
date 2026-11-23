import { useNavigation } from '../app/navigation';
import { BottomBar } from '../components/BottomBar';
import { CalmButton } from '../components/CalmButton';
import { cx, focusRing } from '../components/cx';
import { Screen } from '../components/Screen';
import { ScreenTitle } from '../components/ScreenTitle';
import { formatDuration } from '../content/format';
import { protocols } from '../content/protocols';
import type { Protocol } from '../engine';
import * as audio from '../platform/audio';

type LibraryProtocol = (typeof protocols)[number];

function ProtocolCard({ protocol, onSelect }: { protocol: Protocol; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cx(
        'flex min-h-tap w-full flex-col gap-1 rounded-2xl bg-surface px-5 py-4 text-left active:bg-surface/70',
        focusRing,
      )}
    >
      <span className="flex w-full flex-wrap items-baseline justify-between gap-x-3">
        <span className="text-lg font-medium text-ink">{protocol.name}</span>
        <span className="shrink-0 text-sm text-muted">{formatDuration(protocol.approxSeconds)}</span>
      </span>
      <span className="text-sm text-muted">{protocol.description}</span>
    </button>
  );
}

export function Library() {
  const { navigate } = useNavigation();

  // Every protocol starts straight away: one tap, no gate.
  const start = (protocol: LibraryProtocol) => {
    audio.prime(); // this tap enables sound for the reset's timed tones (iOS)
    navigate({ view: 'reset', protocolId: protocol.id });
  };

  return (
    <Screen
      bottom={
        <BottomBar>
          <CalmButton onClick={() => navigate('home')}>Home</CalmButton>
        </BottomBar>
      }
    >
      <ScreenTitle>Library</ScreenTitle>

      <ul className="flex flex-col gap-3">
        {protocols.map((p) => (
          <li key={p.id}>
            <ProtocolCard protocol={p} onSelect={() => start(p)} />
          </li>
        ))}
      </ul>
    </Screen>
  );
}
