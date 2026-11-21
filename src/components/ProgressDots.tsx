import { cx } from './cx';

/** One small dot per phase: done, current, upcoming. */
export function ProgressDots({ count, current }: { count: number; current: number }) {
  return (
    <div role="img" aria-label={`Part ${current + 1} of ${count}`} className="flex items-center gap-2">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={cx(
            'size-2 rounded-full motion-safe:transition-colors',
            i < current && 'bg-accent/50',
            i === current && 'bg-accent',
            i > current && 'bg-surface',
          )}
        />
      ))}
    </div>
  );
}
