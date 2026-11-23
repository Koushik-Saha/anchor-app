import { useSettings, useStrings } from '../app/settings';
import { resolveCrisisLine } from '../content/crisisLines';
import { deviceLocales } from '../platform/locale';
import { cx, focusRing } from './cx';

const link = cx(
  'inline-block rounded px-1 py-3 text-ink underline decoration-muted underline-offset-4',
  focusRing,
);

/** Discreet crisis line (Home + Done). Visible, never blocking. tel:/sms: open the phone's own apps. */
export function CrisisLine() {
  const { settings } = useSettings();
  const s = useStrings();
  const line = resolveCrisisLine(settings.crisisRegion, deviceLocales(), s);
  return (
    <p className="text-center text-sm text-muted">
      {s.crisis.prefix}{' '}
      {line.segments.map((segment) =>
        segment.href ? (
          <a key={segment.href} href={segment.href} aria-label={segment.ariaLabel} className={link}>
            {segment.text}
          </a>
        ) : (
          <span key={segment.text}>{segment.text}</span>
        ),
      )}
      {line.extra && <span className="block">{line.extra}</span>}
    </p>
  );
}
