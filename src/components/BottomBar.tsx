import type { ReactNode } from 'react';

/** Sticky action row at the bottom of a screen; children share the width equally. */
export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-4 mt-6 flex flex-wrap gap-3 border-t border-surface bg-canvas px-4 pt-3 pb-safe sm:-mx-6 sm:px-6 [&>*]:flex-[1_1_8rem]">
      {children}
    </div>
  );
}
