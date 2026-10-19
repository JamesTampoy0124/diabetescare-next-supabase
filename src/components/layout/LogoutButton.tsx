"use client";

import { useState, useTransition } from "react";
import { logout } from "@/actions/auth";
import { ModalForm } from "@/components/ui/Modal";
import { clearActivity } from "@/lib/session";

interface LogoutButtonProps {
  className: string;
  children: React.ReactNode;
  /** When set, a confirmation pop-up with this message opens first (the admin panel asks; the dashboard does not). */
  confirmMessage?: string;
}

export function LogoutButton({ className, children, confirmMessage }: LogoutButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function doLogout() {
    clearActivity();
    startTransition(async () => {
      await logout();
    });
  }

  return (
    <>
      <button
        type="button"
        className={className}
        disabled={pending}
        onClick={() => (confirmMessage ? setConfirming(true) : doLogout())}
      >
        {children}
      </button>

      {confirming && confirmMessage && (
        <ModalForm
          title="Log out"
          submitLabel="Log Out"
          pendingLabel="Logging out..."
          onClose={() => setConfirming(false)}
          onSubmit={(e) => {
            e.preventDefault();
            doLogout();
          }}
          pending={pending}
        >
          <p style={{ fontSize: 14, color: "#455a64", lineHeight: 1.5 }}>{confirmMessage}</p>
        </ModalForm>
      )}
    </>
  );
}
