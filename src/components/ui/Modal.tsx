"use client";

import { useEffect, useRef, type FormEvent, type ReactNode } from "react";

interface ModalFormProps {
  title: string;
  onClose: () => void;
  /** Leave out for a read-only pop-up (shows only a Close button). */
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  submitLabel?: string;
  /** Text on the submit button while it is working. */
  pendingLabel?: string;
  error?: string;
  pending?: boolean;
  /** Wider pop-up, for content laid out in two columns. */
  wide?: boolean;
  children: ReactNode;
}

/** The original <dialog class="modal"> pop-up. Mount it when needed; unmount it to close. */
export function ModalForm({ title, onClose, onSubmit, submitLabel = "Save", pendingLabel = "Saving...", error, pending, wide, children }: ModalFormProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog ref={ref} className={`modal${wide ? " modal-wide" : ""}`} onClose={onClose}>
      <form onSubmit={onSubmit ?? ((e) => e.preventDefault())}>
        <h3>{title}</h3>
        <div>{children}</div>
        <p className="modal-error" role="alert">
          {error ?? ""}
        </p>
        <div className="modal-actions">
          <button type="button" className="secondary-btn" onClick={onClose} disabled={pending}>
            {onSubmit ? "Cancel" : "Close"}
          </button>
          {onSubmit && (
            <button type="submit" className="primary-btn" disabled={pending}>
              {pending ? pendingLabel : submitLabel}
            </button>
          )}
        </div>
      </form>
    </dialog>
  );
}
