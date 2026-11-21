import type { ReactNode } from 'react';
import { cx } from './cx';

interface ScreenProps {
  children: ReactNode;
  /** Pinned to the bottom of the column (usually a <BottomBar>). */
  bottom?: ReactNode;
  className?: string;
}

/** Shared layout: mobile-first single column, centered at max 480px on larger screens. */
export function Screen({ children, bottom, className }: ScreenProps) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-4 pt-safe sm:px-6">
      <main className={cx('flex flex-1 flex-col', className)}>{children}</main>
      {bottom}
    </div>
  );
}
