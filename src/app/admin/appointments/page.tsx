import { AppointmentsView, type AppointmentRow } from "@/components/admin/AppointmentsView";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  APPOINTMENT_STATUS_LABEL,
  formatPlainDate,
  formatTime,
  patientCode,
  todayInClinicTz,
} from "@/lib/utils/format";
import type { Appointment } from "@/types/database";

const PAGE_SIZE = 20;

const doctorName = (name: string) => `Dr. ${name.replace(/^dr\.?\s+/i, "")}`;

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireProfile(["admin"]);

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();

  const [list, patients, doctors] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "id, appointment_date, appointment_time, status, notes, patient:patients(id, patient_number, name), doctor:profiles!appointments_doctor_id_fkey(id, full_name)",
        { count: "exact" }
      )
      .order("appointment_date", { ascending: false })
      .order("appointment_time", { ascending: false })
      .range(from, from + PAGE_SIZE - 1),
    // The "new appointment" pop-up lists active patients (capped, alphabetical).
    supabase.from("patients").select("id, patient_number, name").eq("status", "Active").order("name").limit(500),
    supabase.from("profiles").select("id, full_name").eq("role", "doctor").eq("active", true).order("full_name"),
  ]);

  const rows: AppointmentRow[] = ((list.data ?? []) as unknown as Appointment[]).map((a) => ({
    id: a.id,
    patient: a.patient?.name ?? "Unknown patient",
    doctor: a.doctor ? doctorName(a.doctor.full_name) : "-",
    dateLabel: formatPlainDate(a.appointment_date),
    timeLabel: formatTime(a.appointment_time),
    status: a.status,
    statusLabel: APPOINTMENT_STATUS_LABEL[a.status],
    notes: a.notes,
  }));

  const patientOptions = ((patients.data ?? []) as { id: string; patient_number: number; name: string }[]).map((p) => ({
    value: p.id,
    label: `${patientCode(p.patient_number)} - ${p.name}`,
  }));

  const doctorOptions = ((doctors.data ?? []) as { id: string; full_name: string }[]).map((d) => ({
    value: d.id,
    label: doctorName(d.full_name),
  }));

  return (
    <AppointmentsView
      rows={rows}
      patients={patientOptions}
      doctors={doctorOptions}
      today={todayInClinicTz()}
      page={page}
      pageSize={PAGE_SIZE}
      total={list.count ?? 0}
    />
  );
}
