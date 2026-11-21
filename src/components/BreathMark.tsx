/** The Anchor mark: a half-filled circle (one breath). Decorative. */
export function BreathMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
      <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3" />
      <path d="M24 4a20 20 0 0 1 0 40z" fill="currentColor" />
    </svg>
  );
}
