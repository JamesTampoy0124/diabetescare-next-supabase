// Idle-timeout settings (used by components/layout/IdleTimeout.tsx).
// Everything is measured in the browser, so no request is made to the server just to track activity.

export const IDLE_LIMIT_MS = 5 * 60 * 1000; // log out after 5 minutes with no mouse / keyboard / touch activity
export const ACTIVITY_STORAGE_KEY = "diabetescare.lastActive";

/** Forget the last-activity time (call when logging in or out). */
export function clearActivity() {
  try {
    localStorage.removeItem(ACTIVITY_STORAGE_KEY);
  } catch {
    /* storage not available */
  }
}

export const LOGIN_NOTICES: Record<string, string> = {
  required: "Please log in first.",
  expired: "You were logged out after 5 minutes of inactivity. Please log in again.",
  inactive: "Your account is no longer active. Please contact the clinic administrator.",
  link: "That link is invalid or has expired. Please request a new one.",
};
