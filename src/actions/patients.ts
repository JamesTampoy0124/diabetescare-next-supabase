"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAdminOrNull } from "@/lib/auth";
import { escapeLike, firstError, str } from "@/lib/utils/form";
import { todayInClinicTz } from "@/lib/utils/format";
import { patientSchema } from "@/lib/validations/records";
import { uuidField } from "@/lib/validations/common";
import type { ActionState } from "@/types/actions";

const NOT_ALLOWED: ActionState = { error: "You do not have permission to do this." };
const GENERIC: ActionState = { error: "Something went wrong while saving. Please try again." };

function refresh() {
  revalidatePath("/admin", "layout");
}

function readPatient(formData: FormData) {
  return patientSchema.safeParse({
    name: str(formData, "name"),
    birthDate: str(formData, "birthDate"),
    phone: str(formData, "phone"),
    email: str(formData, "email"),
    bloodPressure: str(formData, "bloodPressure"),
    hipCm: str(formData, "hipCm"),
    waistCm: str(formData, "waistCm"),
    philhealth: str(formData, "philhealth"),
  });
}

/** Form values -> database columns (an empty measurement is stored as NULL). */
function healthColumns(d: { bloodPressure: string; hipCm: string; waistCm: string; philhealth: string }) {
  return {
    blood_pressure: d.bloodPressure,
    hip_cm: d.hipCm === "" ? null : Number(d.hipCm),
    waist_cm: d.waistCm === "" ? null : Number(d.waistCm),
    philhealth_number: d.philhealth,
  };
}

export async function createPatient(formData: FormData): Promise<ActionState> {
  if (!(await getAdminOrNull())) return NOT_ALLOWED;

  const parsed = readPatient(formData);
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { name, birthDate, phone, email } = parsed.data;
  const health = healthColumns(parsed.data);

  if (birthDate > todayInClinicTz()) return { error: "Date of birth can't be in the future." };

  const supabase = await createClient();

  if (email) {
    const { data: sameEmail } = await supabase.from("patients").select("id").eq("email", email).maybeSingle();
    if (sameEmail) return { error: "A patient with this email already exists." };
  }

  const { data: duplicate } = await supabase
    .from("patients")
    .select("patient_number")
    .ilike("name", escapeLike(name))
    .eq("birth_date", birthDate)
    .limit(1)
    .maybeSingle();

  if (duplicate) {
    const code = "P" + String(duplicate.patient_number).padStart(3, "0");
    return { error: `A patient named ${name} with the same date of birth already exists (${code}).` };
  }

  const { error } = await supabase
    .from("patients")
    .insert({ name, email, phone, birth_date: birthDate, source: "admin", ...health });

  if (error) return error.code === "23505" ? { error: "A patient with this email already exists." } : GENERIC;

  refresh();
  return { success: "Patient added." };
}

export async function updatePatient(formData: FormData): Promise<ActionState> {
  if (!(await getAdminOrNull())) return NOT_ALLOWED;

  const id = uuidField.safeParse(str(formData, "id"));
  if (!id.success) return { error: "Patient not found." };

  const parsed = readPatient(formData);
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { name, birthDate, phone } = parsed.data;
  const health = healthColumns(parsed.data);
  let { email } = parsed.data;

  if (birthDate > todayInClinicTz()) return { error: "Date of birth can't be in the future." };

  const supabase = await createClient();

  const { data: current } = await supabase.from("patients").select("id, email, profile_id").eq("id", id.data).maybeSingle();
  if (!current) return { error: "Patient not found." };

  // A patient who has a login keeps the email of that login.
  if (current.profile_id) email = current.email as string;

  if (email) {
    const { data: sameEmail } = await supabase
      .from("patients")
      .select("id")
      .eq("email", email)
      .neq("id", id.data)
      .maybeSingle();
    if (sameEmail) return { error: "Another patient already uses this email." };
  }

  const { data: duplicate } = await supabase
    .from("patients")
    .select("patient_number")
    .ilike("name", escapeLike(name))
    .eq("birth_date", birthDate)
    .neq("id", id.data)
    .limit(1)
    .maybeSingle();

  if (duplicate) {
    const code = "P" + String(duplicate.patient_number).padStart(3, "0");
    return { error: `A patient with this name and date of birth already exists (${code}).` };
  }

  // The database trigger keeps the patient's login name in step.
  const { error } = await supabase
    .from("patients")
    .update({ name, email, phone, birth_date: birthDate, ...health })
    .eq("id", id.data);

  if (error) return error.code === "23505" ? { error: "Another patient already uses this email." } : GENERIC;

  refresh();
  return { success: "Patient updated." };
}

/** Medical records are archived, never deleted. The database trigger also switches the patient's login off/on. */
export async function setPatientArchived(patientId: string, archive: boolean): Promise<ActionState> {
  if (!(await getAdminOrNull())) return NOT_ALLOWED;

  const id = uuidField.safeParse(patientId);
  if (!id.success) return { error: "Patient not found." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("patients")
    .update({ status: archive ? "Inactive" : "Active" })
    .eq("id", id.data);

  if (error) return GENERIC;

  refresh();
  return { success: archive ? "Patient archived." : "Patient restored." };
}
