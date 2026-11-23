import type { ReactNode } from 'react';
import { useNavigation } from '../app/navigation';
import { useSettings } from '../app/settings';
import { usePrefersReducedMotion } from '../app/useReducedMotion';
import { BottomBar } from '../components/BottomBar';
import { CalmButton } from '../components/CalmButton';
import { DeviceCheck } from '../components/DeviceCheck';
import { cx } from '../components/cx';
import { Screen } from '../components/Screen';
import { ScreenTitle } from '../components/ScreenTitle';
import { Toggle } from '../components/Toggle';
import { CRISIS_CHOICES, crisisLineText, resolveCrisisLine } from '../content/crisisLines';
import * as audio from '../platform/audio';
import * as haptics from '../platform/haptics';
import { deviceLocales } from '../platform/locale';

const PITCHES = [
  { value: 'low', label: 'Low' },
  { value: 'mid', label: 'Mid' },
] as const;

function Group({ title, children }: { title: string; children: ReactNode }) {
  const id = `settings-${title.toLowerCase()}`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="text-sm font-medium tracking-wide text-muted uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

// Deliberately no account section: there is no account.
export function Settings() {
  const { navigate } = useNavigation();
  const { settings, updateSettings } = useSettings();
  const osReducedMotion = usePrefersReducedMotion();
  const crisisLine = resolveCrisisLine(settings.crisisRegion, deviceLocales());

  return (
    <Screen
      bottom={
        <BottomBar>
          <CalmButton onClick={() => navigate('home')}>Home</CalmButton>
        </BottomBar>
      }
    >
      <ScreenTitle>Settings</ScreenTitle>

      <div className="flex flex-col gap-8">
        <Group title="Feel">
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
            description="Soft tones at each change. Off by default."
            checked={settings.sound}
            onChange={(on) => {
              updateSettings({ sound: on });
              if (on) audio.prime(); // this tap enables audio output (required on iOS)
            }}
          />
          <div role="group" aria-label="Tone pitch" className="flex flex-wrap items-center gap-2 rounded-2xl bg-surface p-2 pl-5">
            <span className="grow py-2 text-lg text-ink">Tone pitch</span>
            <div className="flex grow basis-[min(100%,9rem)] flex-wrap gap-2">
            {PITCHES.map(({ value, label }) => (
              <CalmButton
                key={value}
                variant="quiet"
                aria-pressed={settings.tonePitch === value}
                className={cx('grow basis-[4.5rem]', settings.tonePitch === value && 'bg-canvas text-ink')}
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
          </div>
        </Group>

        <Group title="Display">
          <Toggle label="Large text" checked={settings.largeText} onChange={(on) => updateSettings({ largeText: on })} />
          <Toggle
            label="Reduce motion"
            description={
              osReducedMotion ? 'On in your device settings.' : 'The circle fades instead of growing.'
            }
            checked={osReducedMotion || settings.reducedMotion}
            disabled={osReducedMotion}
            onChange={(on) => updateSettings({ reducedMotion: on })}
          />
        </Group>

        <Group title="Crisis line">
          <div role="group" aria-label="Crisis line" className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-2">
            {CRISIS_CHOICES.map(({ value, label }) => (
              <CalmButton
                key={value}
                aria-pressed={settings.crisisRegion === value}
                className={cx('ring-2', settings.crisisRegion === value ? 'text-ink ring-accent' : 'ring-transparent')}
                onClick={() => updateSettings({ crisisRegion: value })}
              >
                {label}
              </CalmButton>
            ))}
          </div>
          <p className="text-sm text-muted">
            {crisisLineText(crisisLine)}
            {crisisLine.extra && `, ${crisisLine.extra}`}
          </p>
        </Group>

        <Group title="Your data">
          <CalmButton className="justify-between" onClick={() => navigate('history')}>
            History
            <span aria-hidden="true" className="text-muted">
              ›
            </span>
          </CalmButton>
        </Group>

        <aside aria-label="About Anchor" className="rounded-2xl border border-surface p-5 text-sm leading-relaxed text-muted">
          Anchor is a self-help tool, not a medical device, and not a substitute for professional care. In crisis:{' '}
          {crisisLineText(crisisLine)}
          {crisisLine.extra && `, ${crisisLine.extra}`}.
        </aside>

        {/* Adapter test panel: development builds only (stripped from production). */}
        {import.meta.env.DEV && <DeviceCheck />}
      </div>
    </Screen>
  );
}
