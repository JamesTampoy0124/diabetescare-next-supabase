"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * For doctors: refreshes the page data once a minute while the tab is open, so a new appointment reminder
 * shows up on the bell without reloading. (The server creates the reminders that are due on each refresh.)
 */
export function ReminderRefresh({ everyMs = 60_000 }: { everyMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, everyMs);

    return () => clearInterval(timer);
  }, [router, everyMs]);

  return null;
}
