"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clearAttempts } from "@/lib/login-attempts";
import { getActiveProfile, getAdminOrNull } from "@/lib/auth";
import { PANEL_ROLES } from "@/lib/roles";
import { escapeLike, firstError, str } from "@/lib/utils/form";
import { todayInClinicTz } from "@/lib/utils/format";
import { patientSchema } from "@/lib/validations/records";
import { passwordField, uuidField } from "@/lib/validations/common";
import type { ActionState } from "@/types/actions";

const NOT_ALLOWED: ActionState = { error: "You do not have permission to do this." };
const GENERIC: ActionState = { error: "Something went wrong while saving. Please try again." };

function refresh() {
  revalidatePath("/admin", "layout");
}

/**
 * Creates the login (email + password) that lets a patient open the patient portal, and links it to the patient record.
 * Returns an error message, or null when it worked.
 */
async function createLoginForRecord(
  patient: { id: string; name: string; email: string; phone: string; birth_date: string | null },
  password: string
): Promise<string | null> {
  const admin = createAdminClient();

  const meta: Record<string, string> = { full_name: patient.name };
  if (patient.phone) meta.phone = patient.phone;
  if (patient.birth_date) meta.birth_date = patient.birth_date;

  const { data, error } = await admin.auth.admin.createUser({
    email: patient.email,
    password,
    email_confirm: true,
    user_metadata: meta,
  });

  if (error || !data.user) {
    if (error?.code === "email_exists" || /already (been )?registered/i.test(error?.message ?? "")) {
      return "A login with this email already exists.";
    }
    if (error?.code === "weak_password") return "That password is too weak. Please choose a stronger one.";
    return "The login could not be created.";
  }

  const newId = data.user.id;

  // New logins are patients by default. Make sure this login is attached to THIS patient record,
  // and remove a duplicate record the sign-up trigger may have made for it.
  await admin.from("patients").delete().eq("profile_id", newId).neq("id", patient.id);
  await admin.from("patients").update({ profile_id: newId }).eq("id", patient.id).is("profile_id", null);
  await admin.from("profiles").update({ role: "patient", full_name: patient.name }).eq("id", newId);

  return null;
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
  if (!(await getActiveProfile(PANEL_ROLES))) return NOT_ALLOWED;

  const parsed = readPatient(formData);
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { name, birthDate, phone, email } = parsed.data;
  const health = healthColumns(parsed.data);

  if (birthDate > todayInClinicTz()) return { error: "Date of birth can't be in the future." };

  // Optional: create the patient's login (email + temporary password) at the same time
  const wantsLogin = str(formData, "createLogin") === "on";
  let password = "";
  if (wantsLogin) {
    if (!email) return { error: "An email address is required to create a login for the patient." };
    const pw = passwordField.safeParse(str(formData, "password"));
    if (!pw.success) return { error: firstError(pw.error) };
    password = pw.data;
  }

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

  const { data: created, error } = await supabase
    .from("patients")
    .insert({ name, email, phone, birth_date: birthDate, source: "admin", ...health })
    .select("id")
    .single();

  if (error || !created) {
    return error?.code === "23505" ? { error: "A patient with this email already exists." } : GENERIC;
  }

  if (wantsLogin) {
    const failure = await createLoginForRecord({ id: created.id, name, email, phone, birth_date: birthDate }, password);
    refresh();
    if (failure) {
      return {
        error: `The patient was added, but the login was not created: ${failure} Close this window and use "Create login" on the patient's row to try again.`,
      };
    }
    return { success: "Patient added with a login." };
  }

  refresh();
  return { success: "Patient added." };
}

/** Creates a login for a patient who is already in the list (for example added without one). */
export async function createLoginForPatient(formData: FormData): Promise<ActionState> {
  if (!(await getActiveProfile(PANEL_ROLES))) return NOT_ALLOWED;

  const id = uuidField.safeParse(str(formData, "id"));
  if (!id.success) return { error: "Patient not found." };

  const pw = passwordField.safeParse(str(formData, "password"));
  if (!pw.success) return { error: firstError(pw.error) };

  const supabase = await createClient();
  const { data: patient } = await supabase
    .from("patients")
    .select("id, name, email, phone, birth_date, status, profile_id")
    .eq("id", id.data)
    .maybeSingle();

  if (!patient) return { error: "Patient not found." };
  if (patient.status !== "Active") return { error: "Restore this patient before creating a login." };
  if (patient.profile_id) return { error: "This patient already has a login." };
  if (!patient.email) return { error: "Add an email address to this patient first (use Edit), then create the login." };

  const failure = await createLoginForRecord(patient, pw.data);
  if (failure) return { error: failure };

  refresh();
  return { success: "Login created." };
}

export async function updatePatient(formData: FormData): Promise<ActionState> {
  if (!(await getActiveProfile(PANEL_ROLES))) return NOT_ALLOWED;

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

/** Administrator only: sets a new temporary password for a patient who has a login (no email needed). */
export async function resetPatientPassword(formData: FormData): Promise<ActionState> {
  if (!(await getAdminOrNull())) return NOT_ALLOWED;

  const id = uuidField.safeParse(str(formData, "id"));
  if (!id.success) return { error: "Patient not found." };

  const pw = passwordField.safeParse(str(formData, "password"));
  if (!pw.success) return { error: firstError(pw.error) };

  const supabase = await createClient();
  const { data: patient } = await supabase
    .from("patients")
    .select("id, email, profile_id")
    .eq("id", id.data)
    .maybeSingle();

  if (!patient) return { error: "Patient not found." };
  if (!patient.profile_id) return { error: "This patient has no login yet. Use Create login instead." };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(patient.profile_id as string, { password: pw.data });

  if (error) {
    if (error.code === "weak_password") return { error: "That password is too weak. Please choose a stronger one." };
    return { error: "We could not reset the password. Please try again." };
  }

  // Also lift any login lock after too many wrong attempts
  if (patient.email) await clearAttempts(admin, patient.email as string);

  return { success: "Password reset." };
}
