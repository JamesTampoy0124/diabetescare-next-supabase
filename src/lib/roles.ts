import type { UserRole } from "@/types/database";

export const ROLES: Record<UserRole, string> = {
  admin: "Administrator",
  doctor: "Doctor",
  nurse: "Nurse",
  frontdesk: "Front Desk",
  patient: "Patient",
};

export const STAFF_ROLES: UserRole[] = ["admin", "doctor", "nurse", "frontdesk"];

// Where each role lands after logging in (same rule as the original script.js)
export const ROLE_HOME: Record<UserRole, string> = {
  admin: "/admin",
  doctor: "/dashboard",
  nurse: "/dashboard",
  frontdesk: "/dashboard",
  patient: "/dashboard",
};

