import { useEffect, useRef, type ReactNode } from 'react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** id of the element that names the sheet (usually its heading). */
  labelledBy: string;
  children: ReactNode;
}

/**
 * Calm bottom panel built on the native <dialog>: focus is moved in and
 * trapped, Escape closes, the page behind is inert — no extra code or dependency.
 * Never use inside the reset flow (no popups there).
 */
export function Sheet({ open, onClose, labelledBy, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onClose={onClose}
      // A click that lands on the dialog element itself is a click on the backdrop.
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-x-0 top-auto bottom-0 m-0 w-full max-w-none bg-transparent p-0 text-ink backdrop:bg-canvas/80"
    >
      <div className="mx-auto flex w-full max-w-[480px] flex-col gap-5 rounded-t-3xl bg-surface px-6 pt-6 pb-safe">
        {children}
      </div>
    </dialog>
  );
}
