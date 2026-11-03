"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { markAllNotificationsRead } from "@/actions/notifications";

export function MarkAllReadButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
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
          else router.refresh();
        })
      }
    >
      Mark all as read
    </button>
  );
}
