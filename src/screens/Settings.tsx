import { useNavigation } from '../app/navigation';
import { useSettings } from '../app/settings';
import { BottomBar } from '../components/BottomBar';
import { CalmButton } from '../components/CalmButton';
import { DeviceCheck } from '../components/DeviceCheck';
import { cx } from '../components/cx';
import { Screen } from '../components/Screen';
import { ScreenTitle } from '../components/ScreenTitle';
import { Toggle } from '../components/Toggle';
import * as audio from '../platform/audio';
import * as haptics from '../platform/haptics';

const PITCHES = [
  { value: 'low', label: 'Low' },
  { value: 'mid', label: 'Mid' },
] as const;

export function Settings() {
  const { navigate } = useNavigation();
  const { settings, updateSettings } = useSettings();

  return (
    <Screen
      bottom={
        <BottomBar>
          <CalmButton onClick={() => navigate('home')}>Home</CalmButton>
        </BottomBar>
      }
    >
      <ScreenTitle>Settings</ScreenTitle>

      <div className="flex flex-col gap-3">
        <Toggle
          label="Haptics"
          checked={settings.haptics}
          onChange={(on) => {
            updateSettings({ haptics: on });
            if (on) {
              haptics.setEnabled(true);
              haptics.pulse('tap'); // feel it as you turn it on
            }
          }}
        />
        <Toggle
          label="Sound"
          checked={settings.sound}
          onChange={(on) => {
            updateSettings({ sound: on });
            if (on) audio.prime(); // this tap unlocks audio output (required on iOS)
          }}
        />

        <div role="group" aria-label="Tone pitch" className="flex items-center gap-2 rounded-2xl bg-surface p-2 pl-5">
          <span className="flex-1 text-lg text-ink">Tone pitch</span>
          {PITCHES.map(({ value, label }) => (
            <CalmButton
              key={value}
              variant="quiet"
              aria-pressed={settings.tonePitch === value}
              className={cx('min-w-20', settings.tonePitch === value && 'bg-canvas text-ink')}
              onClick={() => {
                updateSettings({ tonePitch: value });
                audio.prime();
                audio.toneOnPhaseChange(value); // preview (silent if sound is off)
              }}
            >
              {label}
            </CalmButton>
          ))}
        </div>

        <Toggle label="Large text" checked={settings.largeText} onChange={(on) => updateSettings({ largeText: on })} />

        <CalmButton className="justify-between" onClick={() => navigate('history')}>
          History
          <span aria-hidden="true" className="text-muted">
            ›
          </span>
        </CalmButton>
      </div>

      <DeviceCheck />
    </Screen>
  );
}
