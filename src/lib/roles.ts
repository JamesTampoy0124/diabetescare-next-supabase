import type { UserRole } from "@/types/database";

export const ROLES: Record<UserRole, string> = {
  admin: "Administrator",
  doctor: "Doctor",
  nurse: "Nurse",
  frontdesk: "Front Desk",
  patient: "Patient",
};

// Roles that use the admin panel. Only the administrator sees Staff management.
export const PANEL_ROLES: UserRole[] = ["admin", "doctor", "nurse"];

export const STAFF_ROLES: UserRole[] = ["admin", "doctor", "nurse", "frontdesk"];

// Where each role lands after logging in (same rule as the original script.js)
export const ROLE_HOME: Record<UserRole, string> = {
  admin: "/admin",
  doctor: "/admin",
  nurse: "/admin",
  frontdesk: "/dashboard",
  patient: "/patient",
};

