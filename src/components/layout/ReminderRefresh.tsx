"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Refreshes the page data every `everyMs` while the tab is open and visible, so changes made by someone else
 * (a new reminder, a new appointment, a status change) show up without reloading the browser.
 * Used for doctors (reminders) and on the patient pages.
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
