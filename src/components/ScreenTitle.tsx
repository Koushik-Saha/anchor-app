import type { ReactNode } from 'react';

interface ScreenTitleProps {
  children: ReactNode;
  /** One short, muted line under the title. */
  subtitle?: ReactNode;
}

export function ScreenTitle({ children, subtitle }: ScreenTitleProps) {
  return (
    <header className="pt-6 pb-6">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">{children}</h1>
      {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
    </header>
  );
}
