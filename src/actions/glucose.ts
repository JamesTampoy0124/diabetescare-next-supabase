"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveProfile } from "@/lib/auth";
import { GLUCOSE_DAY, GLUCOSE_RULES, glucoseToMgdl, type GlucoseUnit } from "@/lib/glucose";
import { firstError, str } from "@/lib/utils/form";
import { addGlucoseSchema, voidGlucoseSchema } from "@/lib/validations/glucose";
import type { ActionState } from "@/types/actions";

export interface GlucoseActionState extends ActionState {
  /** Set after a reading was saved, so the page can show the matching advice. */
  mgdl?: number;
  context?: string;
}

const NOT_ALLOWED: GlucoseActionState = { error: "Your role can't record glucose readings." };

function refresh() {
  revalidatePath("/patient/glucose");
  revalidatePath("/admin/glucose");
}

export async function addGlucoseReading(formData: FormData): Promise<GlucoseActionState> {
  const me = await getActiveProfile(["patient", "doctor", "nurse"]);
  if (!me) return NOT_ALLOWED;

  const parsed = addGlucoseSchema.safeParse({
    patientId: str(formData, "patientId"),
    value: str(formData, "value"),
    unit: str(formData, "unit"),
    context: str(formData, "context"),
    takenAt: str(formData, "takenAt"),
    note: str(formData, "note"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { patientId, context, note } = parsed.data;
  const unit = parsed.data.unit as GlucoseUnit;

  const raw = Number(parsed.data.value);
  if (!Number.isFinite(raw)) return { error: "Enter the reading as a number." };

  const mgdl = glucoseToMgdl(raw, unit);
  if (mgdl < GLUCOSE_RULES.entryMin || mgdl > GLUCOSE_RULES.entryMax) {
    return {
      error:
        "That doesn't look right. Meters read about 20-600 mg/dL (1.1-33.3 mmol/L). Check the number and the unit.",
    };
  }

  const takenAt = new Date(parsed.data.takenAt);
  if (Number.isNaN(takenAt.getTime())) return { error: "Enter the date and time of the reading." };
  if (takenAt.getTime() > Date.now() + 5 * 60_000) return { error: "The reading time can't be in the future." };
  if (takenAt.getTime() < Date.now() - 366 * GLUCOSE_DAY) return { error: "Readings older than a year can't be added." };

  const supabase = await createClient();

  if (me.role === "patient") {
    const { data: own } = await supabase.from("patients").select("id, status").eq("profile_id", me.id).maybeSingle();
    if (!own || own.id !== patientId) return { error: "You can only record your own readings." };
    if (own.status !== "Active") return { error: "This patient record is archived." };
  } else {
    const { data: patient } = await supabase.from("patients").select("id, status").eq("id", patientId).maybeSingle();
    if (!patient) return { error: "Choose a patient." };
    if (patient.status !== "Active") return { error: "This patient record is archived." };
  }

  const { error } = await supabase.from("glucose_readings").insert({
    patient_id: patientId,
    value_mgdl: mgdl,
    entered_value: raw,
    entered_unit: unit,
    context,
    measured_at: takenAt.toISOString(),
    notes: note,
    recorded_by: me.id,
  });

  if (error) return { error: "Something went wrong while saving. Please try again." };

  refresh();
  return { success: "Reading saved.", mgdl, context };
}

const VOID_MESSAGES = [
  "Please give a short reason.",
  "This reading is already voided.",
  "Reading not found.",
  "You can't void this reading.",
];

/** A wrong reading is never deleted. It is voided with a reason and stays in the record. */
export async function voidGlucoseReading(formData: FormData): Promise<ActionState> {
  const me = await getActiveProfile(["patient", "doctor", "nurse"]);
  if (!me) return { error: "You can't void this reading." };

  const parsed = voidGlucoseSchema.safeParse({ id: str(formData, "id"), reason: str(formData, "reason") });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.rpc("void_glucose_reading", { p_id: parsed.data.id, p_reason: parsed.data.reason });

  if (error) {
    const known = VOID_MESSAGES.find((m) => error.message.includes(m));
    return { error: known ?? "Something went wrong. Please try again." };
  }

  refresh();
  return { success: "Reading voided." };
}
