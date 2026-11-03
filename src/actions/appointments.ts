"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { firstError, str } from "@/lib/utils/form";
import { todayInClinicTz } from "@/lib/utils/format";
import { appointmentSchema, appointmentStatusSchema } from "@/lib/validations/records";
import type { ActionState } from "@/types/actions";
import type { Profile } from "@/types/database";

const NOT_ALLOWED: ActionState = { error: "You do not have permission to do this." };

/** Admins manage every appointment; doctors manage their own. Nurses, front desk and patients can only view. */
async function getScheduler(): Promise<{ me: Profile } | { error: ActionState }> {
  const profile = await getCurrentProfile();

  if (!profile) return { error: { error: "Your session has expired. Please log in again." } };
  if (!profile.active) return { error: { error: "Your account is not active. Please contact the administrator." } };
  if (profile.role !== "admin" && profile.role !== "doctor") {
    return {
      error: { error: `Your role (${ROLES[profile.role]}) can't create or change appointments. Only administrators and doctors can.` },
    };
  }

  return { me: profile };
}

function refresh() {
  revalidatePath("/admin", "layout");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/patient");
}

export async function createAppointment(formData: FormData): Promise<ActionState> {
  const scheduler = await getScheduler();
  if ("error" in scheduler) return scheduler.error;
  const me = scheduler.me;

  const parsed = appointmentSchema.safeParse({
    patientId: str(formData, "patientId"),
    // A doctor's appointments are always their own; only an administrator chooses the doctor
    doctorId: me.role === "doctor" ? me.id : str(formData, "doctorId"),
    date: str(formData, "date"),
    time: str(formData, "time"),
    notes: str(formData, "notes"),
    meetingLink: str(formData, "meetingLink"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { patientId, doctorId, date, time, notes, meetingLink } = parsed.data;

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
    meeting_link: meetingLink,
    status: "pending",
    created_by: me.id,
  });

  if (error) return { error: "Something went wrong while saving. Please try again." };

  refresh();
  return { success: "Appointment created." };
}

export async function updateAppointmentStatus(formData: FormData): Promise<ActionState> {
  const scheduler = await getScheduler();
  if ("error" in scheduler) return scheduler.error;
  const me = scheduler.me;

  const parsed = appointmentStatusSchema.safeParse({
    id: str(formData, "id"),
    status: str(formData, "status"),
    // only present when the form has the meeting link box
    meetingLink: formData.has("meetingLink") ? str(formData, "meetingLink") : undefined,
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();

  // A doctor may only change their own appointments (the database enforces this too)
  if (me.role === "doctor") {
    const { data: own } = await supabase
      .from("appointments")
      .select("id")
      .eq("id", parsed.data.id)
      .eq("doctor_id", me.id)
      .maybeSingle();
    if (!own) return NOT_ALLOWED;
  }

  const changes: { status: string; meeting_link?: string } = { status: parsed.data.status };
  if (parsed.data.meetingLink !== undefined) changes.meeting_link = parsed.data.meetingLink;

  const { error } = await supabase.from("appointments").update(changes).eq("id", parsed.data.id);

  if (error) return { error: "Something went wrong. Please try again." };

  refresh();
  return { success: "Appointment updated." };
}
