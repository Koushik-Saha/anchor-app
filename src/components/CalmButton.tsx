import type { ButtonHTMLAttributes } from 'react';
import { cx, focusRing } from './cx';

interface CalmButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * surface — filled secondary button, 64px min (safe inside the reset flow).
   * quiet — text-only, 48px min, for low-emphasis links outside the reset flow.
   */
  variant?: 'surface' | 'quiet';
}

const variants = {
  surface: 'min-h-tap rounded-2xl bg-surface px-5 text-lg text-ink active:bg-surface/70',
  quiet: 'min-h-12 rounded-xl px-4 text-base text-muted hover:text-ink active:text-ink',
} as const;

/** Secondary action. Never competes with the BigButton. */
export function CalmButton({ variant = 'surface', className, type = 'button', ...props }: CalmButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex select-none items-center justify-center gap-2 font-medium',
        'motion-safe:transition-colors',
        variants[variant],
        focusRing,
        className,
      )}
      {...props}
    />
  );
}
