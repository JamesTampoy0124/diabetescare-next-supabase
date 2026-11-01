// Hand-written row types that mirror supabase/migrations/001_initial_schema.sql.
// Once the project is connected you can replace them with generated types:
//   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.ts

export type UserRole = "admin" | "doctor" | "nurse" | "frontdesk" | "patient";
export type RecordStatus = "Active" | "Inactive";
export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled";
export type ReportType = "patient" | "glucose" | "appointment";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  specialty: string;
  phone: string;
  birth_date: string | null;
  active: boolean;
  created_at: string;
}

export interface Patient {
  id: string;
  patient_number: number;
  name: string;
  email: string;
  phone: string;
  birth_date: string | null;
  blood_pressure: string; // "120/80" or ""
  hip_cm: number | null;
  waist_cm: number | null;
  philhealth_number: string; // 12 digits or ""
  status: RecordStatus;
  source: "admin" | "self-registration";
  profile_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  appointment_date: string; // YYYY-MM-DD (clinic local date)
  appointment_time: string; // HH:MM:SS (clinic local time)
  status: AppointmentStatus;
  notes: string;
  meeting_link: string;
  patient: { id: string; patient_number: number; name: string } | null;
  doctor: { id: string; full_name: string } | null;
}

export interface Medication {
  id: string;
  name: string;
  description: string;
  dosage: string;
  status: RecordStatus;
}

export interface Report {
  id: string;
  type: ReportType;
  summary: Record<string, number | null>;
  generated_at: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
}
