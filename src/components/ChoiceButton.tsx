import { cx, focusRing } from './cx';

interface ChoiceButtonProps {
  title: string;
  /** One short line under the title. */
  line?: string;
  /** Marked with an accent border. */
  selected?: boolean;
  /** How a screen reader hears "selected": a toggle (pressed) or the remembered choice (current). */
  selectedAs?: 'pressed' | 'current';
  /** Shown at the end of the row, e.g. the step's place in the order. */
  badge?: string;
  onClick: () => void;
}

/** A big one-tap choice: used wherever a screen asks for one decision. */
export function ChoiceButton({ title, line, selected = false, selectedAs = 'current', badge, onClick }: ChoiceButtonProps) {
  const state =
    selectedAs === 'pressed' ? { 'aria-pressed': selected } : { 'aria-current': selected ? ('true' as const) : undefined };
  return (
    <button
      type="button"
      onClick={onClick}
      {...state}
      className={cx(
        'flex min-h-24 w-full items-center justify-between gap-3 rounded-2xl bg-surface px-5 py-4 text-left active:bg-surface/70',
        'border-2',
        selected ? 'border-accent' : 'border-transparent',
        focusRing,
      )}
    >
      <span className="flex min-w-0 flex-col justify-center gap-1">
        <span className="text-xl font-medium text-ink">{title}</span>
        {line && <span className="text-base text-muted">{line}</span>}
      </span>
      {badge && <span className="shrink-0 text-2xl font-semibold text-accent">{badge}</span>}
    </button>
  );
}
