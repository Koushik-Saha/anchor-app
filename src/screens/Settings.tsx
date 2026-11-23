import { useId, type ReactNode } from 'react';
import { useNavigation } from '../app/navigation';
import { useSettings, useStrings } from '../app/settings';
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

const PITCHES = ['low', 'mid'] as const;
const LANGUAGES = ['auto', 'en', 'es'] as const;

function Group({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
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
  const s = useStrings();
  const osReducedMotion = usePrefersReducedMotion();
  const crisisLine = resolveCrisisLine(settings.crisisRegion, deviceLocales(), s);

  return (
    <Screen
      bottom={
        <BottomBar>
          <CalmButton onClick={() => navigate('home')}>{s.common.home}</CalmButton>
        </BottomBar>
      }
    >
      <ScreenTitle>{s.settings.title}</ScreenTitle>

      <div className="flex flex-col gap-8">
        <Group title={s.settings.feel}>
          <Toggle
            label={s.settings.haptics}
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
            label={s.settings.sound}
            description={s.settings.soundHint}
            checked={settings.sound}
            onChange={(on) => {
              updateSettings({ sound: on });
              if (on) audio.prime(); // this tap enables audio output (required on iOS)
            }}
          />
          <div role="group" aria-label={s.settings.tonePitch} className="flex flex-wrap items-center gap-2 rounded-2xl bg-surface p-2 pl-5">
            <span className="grow py-2 text-lg text-ink">{s.settings.tonePitch}</span>
            <div className="flex grow basis-[min(100%,9rem)] flex-wrap gap-2">
            {PITCHES.map((value) => (
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
                {s.settings[value]}
              </CalmButton>
            ))}
            </div>
          </div>
        </Group>

        <Group title={s.settings.display}>
          <Toggle label={s.settings.largeText} checked={settings.largeText} onChange={(on) => updateSettings({ largeText: on })} />
          <Toggle
            label={s.settings.reduceMotion}
            description={
              osReducedMotion ? s.settings.motionOs : s.settings.motionHint
            }
            checked={osReducedMotion || settings.reducedMotion}
            disabled={osReducedMotion}
            onChange={(on) => updateSettings({ reducedMotion: on })}
          />
        </Group>

        <Group title={s.settings.language}>
          <div role="group" aria-label={s.settings.language} className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,7rem),1fr))] gap-2">
            {LANGUAGES.map((value) => (
              <CalmButton
                key={value}
                lang={value === 'en' ? 'en' : value === 'es' ? 'es' : undefined}
                aria-pressed={settings.language === value}
                className={cx('ring-2', settings.language === value ? 'text-ink ring-accent' : 'ring-transparent')}
                onClick={() => updateSettings({ language: value })}
              >
                {value === 'auto' ? s.settings.languageAuto : value === 'en' ? 'English' : 'Español'}
              </CalmButton>
            ))}
          </div>
        </Group>

        <Group title={s.settings.crisis}>
          <div role="group" aria-label={s.settings.crisis} className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-2">
            {CRISIS_CHOICES.map(({ value }) => (
              <CalmButton
                key={value}
                aria-pressed={settings.crisisRegion === value}
                className={cx('ring-2', settings.crisisRegion === value ? 'text-ink ring-accent' : 'ring-transparent')}
                onClick={() => updateSettings({ crisisRegion: value })}
              >
                {s.crisis.choices[value]}
              </CalmButton>
            ))}
          </div>
          <p className="text-sm text-muted">
            {crisisLineText(crisisLine)}
            {crisisLine.extra && `, ${crisisLine.extra}`}
          </p>
        </Group>

        <Group title={s.settings.yourData}>
          <CalmButton className="justify-between" onClick={() => navigate('history')}>
            {s.settings.history}
            <span aria-hidden="true" className="text-muted">
              ›
            </span>
          </CalmButton>
        </Group>

        <aside aria-label={s.settings.about} className="rounded-2xl border border-surface p-5 text-sm leading-relaxed text-muted">
          {s.settings.disclaimer} {s.settings.inCrisis}{' '}
          {crisisLineText(crisisLine)}
          {crisisLine.extra && `, ${crisisLine.extra}`}.
        </aside>

        {/* Adapter test panel: development builds only (stripped from production). */}
        {import.meta.env.DEV && <DeviceCheck />}
      </div>
    </Screen>
  );
}
