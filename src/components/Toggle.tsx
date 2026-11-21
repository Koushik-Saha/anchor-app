import { useId } from 'react';
import { cx, focusRing } from './cx';

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** One short muted line under the label. */
  description?: string;
  disabled?: boolean;
}

/** On/off settings row. The whole row is the tap target (64px min). */
export function Toggle({ label, checked, onChange, description, disabled = false }: ToggleProps) {
  const id = useId();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={`${id}-label`}
      aria-describedby={description ? `${id}-desc` : undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        'flex min-h-tap w-full items-center justify-between gap-4 rounded-2xl bg-surface px-5 py-3 text-left',
        'disabled:cursor-default',
        focusRing,
      )}
    >
      <span className="flex flex-col">
        <span id={`${id}-label`} className="text-lg text-ink">
          {label}
        </span>
        {description && (
          <span id={`${id}-desc`} className="text-sm text-muted">
            {description}
          </span>
        )}
      </span>
      <span
        aria-hidden="true"
        className={cx(
          'relative h-8 w-14 shrink-0 rounded-full motion-safe:transition-colors',
          checked ? 'bg-accent' : 'bg-canvas',
          disabled && 'opacity-60',
        )}
      >
        <span
          className={cx(
            'absolute top-1 left-0 size-6 rounded-full motion-safe:transition-transform',
            checked ? 'translate-x-7 bg-canvas' : 'translate-x-1 bg-muted',
          )}
        />
      </span>
    </button>
  );
}
