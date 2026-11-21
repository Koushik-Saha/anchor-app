import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cx, focusRing } from './cx';

type BigButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

/** Primary action. Min height 96px (6rem, scales with large text), accent fill. */
export const BigButton = forwardRef<HTMLButtonElement, BigButtonProps>(function BigButton(
  { className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        'flex min-h-24 w-full select-none items-center justify-center gap-4 rounded-3xl bg-accent px-6',
        'text-2xl font-semibold text-canvas',
        'motion-safe:transition-transform motion-safe:active:scale-[0.98]',
        'disabled:opacity-50',
        focusRing,
        className,
      )}
      {...props}
    />
  );
});
