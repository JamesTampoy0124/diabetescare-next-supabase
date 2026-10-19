// Display helpers. The date helpers below run on the server only (they read CLINIC_TIMEZONE).

export function initials(name: string): string {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  const first = parts.length ? parts[0][0] : "?";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/** P001, P002 ... (the old patient IDs) */
export function patientCode(n: number): string {
  return "P" + String(n).padStart(3, "0");
}

const clinicTimeZone = () => process.env.CLINIC_TIMEZONE || "Asia/Manila";

/** Today's date in the clinic's time zone as YYYY-MM-DD. */
export function todayInClinicTz(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: clinicTimeZone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** First and last day of the month that contains `today` (YYYY-MM-DD). */
export function monthRange(today: string): { first: string; last: string } {
  const [y, m] = today.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, "0");
  return { first: `${y}-${mm}-01`, last: `${y}-${mm}-${String(lastDay).padStart(2, "0")}` };
}

/** Timestamp -> "Oct 12, 2026" in the clinic time zone. */
export function formatDate(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: clinicTimeZone() });
}

/** Plain date (YYYY-MM-DD) -> "Oct 12, 2026". No time-zone conversion. */
export function formatPlainDate(date?: string | null): string {
  if (!date) return "-";
  const d = new Date(date + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

/** "09:00:00" -> "9:00 AM" */
export function formatTime(time?: string | null): string {
  if (!time) return "-";
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return "-";
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** "2026-10-12" -> { day: "12", month: "OCT" } (the little date box) */
export function dateBox(date: string): { day: string; month: string } {
  const d = new Date(date + "T00:00:00Z");
  return {
    day: String(d.getUTCDate()),
    month: d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase(),
  };
}

export function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return formatDate(iso);
}

export const APPOINTMENT_STATUS_LABEL = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
} as const;

/** Timestamp -> "Oct 12, 2026, 9:05 AM" in the clinic time zone. */
export function formatDateTime(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: clinicTimeZone(),
  });
}
