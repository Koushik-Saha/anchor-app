import { getCachedCustomReset } from '../app/customResetStore';
import { useNavigation } from '../app/navigation';
import { useStrings } from '../app/settings';
import { BottomBar } from '../components/BottomBar';
import { CalmButton } from '../components/CalmButton';
import { cx, focusRing } from '../components/cx';
import { Screen } from '../components/Screen';
import { ScreenTitle } from '../components/ScreenTitle';
import { CUSTOM_RESET_ID, customProtocol } from '../content/customReset';
import { formatDuration } from '../content/format';
import { localizeProtocol } from '../content/localize';
import { protocols } from '../content/protocols';
import type { Protocol } from '../engine';
import * as audio from '../platform/audio';

type LibraryProtocol = (typeof protocols)[number];

function ProtocolCard({ protocol, onSelect }: { protocol: Protocol; onSelect: () => void }) {
  const s = useStrings();
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
        <span className="text-lg font-medium text-ink [overflow-wrap:anywhere]">{protocol.name}</span>
        <span className="shrink-0 text-sm text-muted">{formatDuration(protocol.approxSeconds, s.units)}</span>
      </span>
      <span className="text-sm text-muted">{protocol.description}</span>
    </button>
  );
}

export function Library() {
  const { navigate } = useNavigation();
  const s = useStrings();

  // One tap, no gate: a protocol starts straight away, or (if it lets you choose
  // a breathing pattern) opens the pattern picker, where one more tap starts it.
  const start = (protocol: LibraryProtocol) => {
    if ('choosePattern' in protocol && protocol.choosePattern) {
      navigate({ view: 'pattern', protocolId: protocol.id });
      return;
    }
    audio.prime(); // this tap enables sound for the reset's timed tones (iOS)
    navigate({ view: 'reset', protocolId: protocol.id });
  };

  const custom = getCachedCustomReset();
  const startCustom = () => {
    audio.prime();
    navigate({ view: 'reset', protocolId: CUSTOM_RESET_ID });
  };

  return (
    <Screen
      bottom={
        <BottomBar>
          <CalmButton onClick={() => navigate('home')}>{s.common.home}</CalmButton>
        </BottomBar>
      }
    >
      <ScreenTitle>{s.library.title}</ScreenTitle>

      <ul className="flex flex-col gap-3">
        {protocols.map((p) => (
          <li key={p.id}>
            <ProtocolCard protocol={localizeProtocol(p, s)} onSelect={() => start(p)} />
          </li>
        ))}
        {custom && (
          <li>
            <ProtocolCard protocol={customProtocol(custom, s)} onSelect={startCustom} />
          </li>
        )}
      </ul>

      <CalmButton variant="quiet" className="mt-4 self-center" onClick={() => navigate('builder')}>
        {custom ? s.library.change : s.library.build}
      </CalmButton>
    </Screen>
  );
}
