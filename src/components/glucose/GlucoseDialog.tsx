"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";

interface GlucoseDialogProps {
  title: string;
  submitLabel: string;
  onClose: () => void;
  /** Returns an error message to show, or null when it worked (the dialog then closes). */
  onSubmit: (data: FormData) => Promise<string | null>;
  children: ReactNode;
}

/** The pop-up used for "Add reading" and "Void reading". Mount it to open it. */
export function GlucoseDialog({ title, submitLabel, onClose, onSubmit, children }: GlucoseDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog ref={ref} className="g-dialog" onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);

          startTransition(async () => {
            const message = await onSubmit(data);
            if (message) setError(message);
            else onClose();
          });
        }}
      >
        <h3>{title}</h3>
        <div>{children}</div>
        <p className="g-error" role="alert">
          {error}
        </p>
        <div className="g-actions">
          <button type="button" className="g-btn secondary" onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button type="submit" className="g-btn" disabled={pending}>
            {pending ? "Saving..." : submitLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
