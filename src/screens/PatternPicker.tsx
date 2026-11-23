import { useNavigation } from '../app/navigation';
import { useSettings, useStrings } from '../app/settings';
import { BottomBar } from '../components/BottomBar';
import { CalmButton } from '../components/CalmButton';
import { ChoiceButton } from '../components/ChoiceButton';
import { Screen } from '../components/Screen';
import { ScreenTitle } from '../components/ScreenTitle';
import { BREATH_PATTERNS, getBreathPattern } from '../content/breathPatterns';
import type { ProtocolId } from '../content/protocols';
import { protocolText } from '../content/strings';
import * as audio from '../platform/audio';

/**
 * Pick a breathing pattern, then the reset starts straight away: one tap per choice,
 * big targets, one short line each. The last-used pattern is marked and remembered
 * on-device (settings.breathPattern), so "Again" on Done reuses it.
 */
export function PatternPicker({ protocolId }: { protocolId: ProtocolId }) {
  const { navigate } = useNavigation();
  const { settings, updateSettings } = useSettings();
  const s = useStrings();
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
          <CalmButton onClick={() => navigate('library')}>{s.common.library}</CalmButton>
        </BottomBar>
      }
    >
      <ScreenTitle subtitle={s.picker.subtitle}>{protocolText(s, protocolId)?.name ?? s.builder.steps.breathing}</ScreenTitle>

      <ul className="flex flex-col gap-3">
        {BREATH_PATTERNS.map((pattern) => (
          <li key={pattern.id}>
            <ChoiceButton
              title={s.patterns[pattern.id].name}
              line={s.patterns[pattern.id].line}
              selected={pattern.id === lastUsed}
              onClick={() => start(pattern.id)}
            />
          </li>
        ))}
      </ul>
    </Screen>
  );
}
