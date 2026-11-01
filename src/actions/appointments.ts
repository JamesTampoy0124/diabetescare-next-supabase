"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAdminOrNull } from "@/lib/auth";
import { firstError, str } from "@/lib/utils/form";
import { todayInClinicTz } from "@/lib/utils/format";
import { appointmentSchema, appointmentStatusSchema } from "@/lib/validations/records";
import type { ActionState } from "@/types/actions";

const NOT_ALLOWED: ActionState = { error: "You do not have permission to do this." };

function refresh() {
  revalidatePath("/admin", "layout");
}

export async function createAppointment(formData: FormData): Promise<ActionState> {
  const me = await getAdminOrNull();
  if (!me) return NOT_ALLOWED;

  const parsed = appointmentSchema.safeParse({
    patientId: str(formData, "patientId"),
    doctorId: str(formData, "doctorId"),
    date: str(formData, "date"),
    time: str(formData, "time"),
    notes: str(formData, "notes"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { patientId, doctorId, date, time, notes } = parsed.data;

  if (date < todayInClinicTz()) return { error: "Choose today or a later date." };

  const supabase = await createClient();

  const [{ data: patient }, { data: doctor }] = await Promise.all([
    supabase.from("patients").select("id").eq("id", patientId).eq("status", "Active").maybeSingle(),
    supabase.from("profiles").select("id").eq("id", doctorId).eq("role", "doctor").eq("active", true).maybeSingle(),
  ]);

  if (!patient) return { error: "Choose an active patient." };
  if (!doctor) return { error: "Choose an active doctor." };

  const { error } = await supabase.from("appointments").insert({
    patient_id: patientId,
    doctor_id: doctorId,
    appointment_date: date,
    appointment_time: time,
    notes,
    status: "pending",
    created_by: me.id,
  });

  if (error) return { error: "Something went wrong while saving. Please try again." };

  refresh();
  return { success: "Appointment created." };
}

export async function updateAppointmentStatus(formData: FormData): Promise<ActionState> {
  if (!(await getAdminOrNull())) return NOT_ALLOWED;

  const parsed = appointmentStatusSchema.safeParse({ id: str(formData, "id"), status: str(formData, "status") });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("appointments").update({ status: parsed.data.status }).eq("id", parsed.data.id);

  if (error) return { error: "Something went wrong. Please try again." };

  refresh();
  return { success: "Appointment updated." };
}
