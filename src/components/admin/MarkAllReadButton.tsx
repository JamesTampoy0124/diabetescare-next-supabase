"use client";

import { useTransition } from "react";
import { markAllNotificationsRead } from "@/actions/notifications";

export function MarkAllReadButton({ disabled }: { disabled: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="action-btn"
      disabled={disabled || pending}
      onClick={() =>
        startTransition(async () => {
          const result = await markAllNotificationsRead();
          if (result.error) window.alert(result.error);
        })
      }
    >
      Mark all as read
    </button>
  );
}
