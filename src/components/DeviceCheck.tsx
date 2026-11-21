import { useEffect, useState, type ReactNode } from 'react';
import { useSettings } from '../app/settings';
import * as audio from '../platform/audio';
import * as haptics from '../platform/haptics';
import * as wakeLock from '../platform/wakeLock';
import { CalmButton } from './CalmButton';
import { Toggle } from './Toggle';

function Check({ title, status, children }: { title: string; status: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-surface/50 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-medium text-ink">{title}</h3>
        <p className="text-right text-sm text-muted" aria-live="polite">
          {status}
        </p>
      </div>
      {children}
    </div>
  );
}

/** Lets you verify each platform adapter on a real device. */
export function DeviceCheck() {
  const { settings } = useSettings();
  const [wakeHeld, setWakeHeld] = useState(wakeLock.isHeld);
  const [lastPulse, setLastPulse] = useState<haptics.HapticPattern | null>(null);

  // Leaving Settings lets the screen sleep again.
  useEffect(() => () => void wakeLock.release(), []);

  const vibrationStatus = !haptics.isSupported()
    ? 'Not available in this browser'
    : !settings.haptics
      ? 'Turn on Haptics above'
      : lastPulse
        ? `Sent “${lastPulse}”`
        : 'Ready';

  const toneStatus = !audio.isSupported()
    ? 'Not available in this browser'
    : !settings.sound
      ? 'Turn on Sound above'
      : `Ready · ${settings.tonePitch} pitch`;

  const wakeStatus = !wakeLock.isSupported()
    ? 'Needs https or localhost'
    : wakeHeld
      ? 'Screen will stay on'
      : 'Off';

  const testPulse = (pattern: haptics.HapticPattern) => {
    haptics.pulse(pattern);
    setLastPulse(pattern);
  };

  const toggleWakeLock = async (on: boolean) => {
    await (on ? wakeLock.acquire() : wakeLock.release());
    setWakeHeld(wakeLock.isHeld());
  };

  return (
    <section aria-labelledby="device-check" className="mt-8 flex flex-col gap-3">
      <h2 id="device-check" className="text-sm font-medium tracking-wide text-muted uppercase">
        Test on this device
      </h2>

      <Check title="Vibration" status={vibrationStatus}>
        <div className="grid grid-cols-3 gap-2">
          {(['tap', 'phase', 'done'] as const).map((p) => (
            <CalmButton key={p} className="capitalize" onClick={() => testPulse(p)}>
              {p}
            </CalmButton>
          ))}
        </div>
      </Check>

      <Check title="Tone" status={toneStatus}>
        <CalmButton
          onClick={() => {
            audio.prime();
            audio.toneOnPhaseChange(settings.tonePitch);
          }}
        >
          Play tone
        </CalmButton>
      </Check>

      <Check title="Keep screen on" status={wakeStatus}>
        <Toggle label="Hold wake lock" checked={wakeHeld} onChange={(on) => void toggleWakeLock(on)} />
      </Check>
    </section>
  );
}
