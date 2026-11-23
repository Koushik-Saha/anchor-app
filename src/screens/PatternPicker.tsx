import { useNavigation } from '../app/navigation';
import { useSettings } from '../app/settings';
import { BottomBar } from '../components/BottomBar';
import { CalmButton } from '../components/CalmButton';
import { cx, focusRing } from '../components/cx';
import { Screen } from '../components/Screen';
import { ScreenTitle } from '../components/ScreenTitle';
import { BREATH_PATTERNS, getBreathPattern } from '../content/breathPatterns';
import { getProtocol, type ProtocolId } from '../content/protocols';
import * as audio from '../platform/audio';

/**
 * Pick a breathing pattern, then the reset starts straight away: one tap per choice,
 * big targets, one short line each. The last-used pattern is marked and remembered
 * on-device (settings.breathPattern), so "Again" on Done reuses it.
 */
export function PatternPicker({ protocolId }: { protocolId: ProtocolId }) {
  const { navigate } = useNavigation();
  const { settings, updateSettings } = useSettings();
  const lastUsed = getBreathPattern(settings.breathPattern).id;

  const start = (patternId: string) => {
    audio.prime(); // this tap enables sound for the reset's timed tones (iOS)
    updateSettings({ breathPattern: patternId });
    navigate({ view: 'reset', protocolId });
  };

  return (
    <Screen
      bottom={
        <BottomBar>
          <CalmButton onClick={() => navigate('library')}>Library</CalmButton>
        </BottomBar>
      }
    >
      <ScreenTitle subtitle="Pick a rhythm.">{getProtocol(protocolId)?.name ?? 'Breathing'}</ScreenTitle>

      <ul className="flex flex-col gap-3">
        {BREATH_PATTERNS.map((pattern) => {
          const isLast = pattern.id === lastUsed;
          return (
            <li key={pattern.id}>
              <button
                type="button"
                onClick={() => start(pattern.id)}
                // The remembered choice: accent border, announced as "current" by screen readers.
                aria-current={isLast ? 'true' : undefined}
                className={cx(
                  'flex min-h-24 w-full flex-col justify-center gap-1 rounded-2xl bg-surface px-5 py-4 text-left active:bg-surface/70',
                  'border-2',
                  isLast ? 'border-accent' : 'border-transparent',
                  focusRing,
                )}
              >
                <span className="text-xl font-medium text-ink">{pattern.name}</span>
                <span className="text-base text-muted">{pattern.line}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Screen>
  );
}
