"use client";

import { useEffect } from "react";
import { expireSession } from "@/actions/auth";
import { ACTIVITY_STORAGE_KEY, IDLE_LIMIT_MS, clearActivity } from "@/lib/session";

const EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "wheel", "touchstart", "click"] as const;
const CHECK_EVERY_MS = 5000;
const WRITE_EVERY_MS = 1000;

/**
 * Logs the person out after 5 minutes with no activity (mouse, keyboard, scroll or touch).
 * The last-activity time lives in localStorage, so several open tabs share it and a tab that was
 * closed or asleep is checked as soon as it is opened again. No network calls are made to track activity.
 */
export function IdleTimeout() {
  useEffect(() => {
    let ended = false;

    const readLast = () => {
      try {
        return Number(localStorage.getItem(ACTIVITY_STORAGE_KEY) ?? 0);
      } catch {
        return 0;
      }
    };

    const writeNow = () => {
      try {
        localStorage.setItem(ACTIVITY_STORAGE_KEY, String(Date.now()));
      } catch {
        /* storage not available */
      }
    };

    const endSession = () => {
      if (ended) return;
      ended = true;
      clearActivity();
      void expireSession();
    };

    const isIdle = () => {
      const last = readLast();
      return last > 0 && Date.now() - last >= IDLE_LIMIT_MS;
    };

    // Away for longer than the limit (tab was closed, laptop asleep)? Log out straight away.
    if (isIdle()) {
      endSession();
      return;
    }

    writeNow();

    let lastWrite = Date.now();
    const onActivity = () => {
      const now = Date.now();
      if (now - lastWrite < WRITE_EVERY_MS) return;
      lastWrite = now;
      writeNow();
    };

    EVENTS.forEach((evt) => document.addEventListener(evt, onActivity, { passive: true }));
    const interval = setInterval(() => {
      if (isIdle()) endSession();
    }, CHECK_EVERY_MS);

    return () => {
      clearInterval(interval);
      EVENTS.forEach((evt) => document.removeEventListener(evt, onActivity));
    };
  }, []);

  return null;
}
