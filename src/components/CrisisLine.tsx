import { cx, focusRing } from './cx';

const link = cx(
  'inline-block rounded px-1 py-3 text-ink underline decoration-muted underline-offset-4',
  focusRing,
);

/** Discreet 988 line (Home + Done). Visible, never blocking. tel:/sms: open the phone's own apps. */
export function CrisisLine() {
  return (
    <p className="text-center text-sm text-muted">
      In crisis?{' '}
      <a href="tel:988" className={link}>
        Call
      </a>{' '}
      or{' '}
      <a href="sms:988" className={link}>
        text
      </a>{' '}
      988 (US)
    </p>
  );
}
