import type { ReportType } from "@/types/database";

export const REPORT_TITLES: Record<ReportType, string> = {
  patient: "Patient Report",
  glucose: "Glucose Report",
  appointment: "Appointment Report",
};

// Keys match the JSON built by public.generate_report() in 001_initial_schema.sql
export const REPORT_FIELDS: Record<ReportType, { key: string; label: string }[]> = {
  patient: [
    { key: "total", label: "Total patients" },
    { key: "active", label: "Active" },
    { key: "inactive", label: "Inactive (archived)" },
    { key: "self_registered", label: "Self-registered" },
    { key: "added_by_staff", label: "Added by staff" },
  ],
  appointment: [
    { key: "total", label: "Total appointments" },
    { key: "pending", label: "Pending" },
    { key: "confirmed", label: "Confirmed" },
    { key: "completed", label: "Completed" },
    { key: "cancelled", label: "Cancelled" },
    { key: "upcoming", label: "Upcoming (pending or confirmed)" },
  ],
  glucose: [
    { key: "readings", label: "Readings recorded" },
    { key: "patients", label: "Patients with readings" },
    { key: "average", label: "Average (mg/dL)" },
    { key: "lowest", label: "Lowest (mg/dL)" },
    { key: "highest", label: "Highest (mg/dL)" },
  ],
};
