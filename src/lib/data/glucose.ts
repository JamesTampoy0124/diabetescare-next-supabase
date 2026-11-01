import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GLUCOSE_DAY, buildGlucoseAlerts, type GlucoseAlert, type GlucoseContext, type GlucoseReading } from "@/lib/glucose";
import { patientCode } from "@/lib/utils/format";

export const GLUCOSE_HISTORY_DAYS = 90;

interface ListRow {
  id: string;
  patient_id: string;
  value_mgdl: number | string;
  context: GlucoseContext;
  measured_at: string;
  notes: string;
  status: "valid" | "voided";
  recorded_by: string | null;
  recorded_by_name: string | null;
  recorded_by_role: string | null;
  voided_by_name: string | null;
  void_reason: string | null;
}

/** Up to 90 days of readings for one patient, oldest first (valid and voided). Who may see them is decided in the database. */
export async function loadGlucoseReadings(
  supabase: SupabaseClient,
  patientId: string,
  nowMs: number,
  viewerId: string
): Promise<GlucoseReading[]> {
  const since = new Date(nowMs - GLUCOSE_HISTORY_DAYS * GLUCOSE_DAY).toISOString();
  const { data } = await supabase.rpc("glucose_list", { p_patient: patientId, p_since: since });

  return ((data ?? []) as ListRow[]).map((r) => ({
    id: r.id,
    patientId: r.patient_id,
    mgdl: Number(r.value_mgdl),
    context: r.context,
    takenAt: r.measured_at,
    note: r.notes ?? "",
    status: r.status,
    recordedByName: r.recorded_by_name ?? "",
    recordedByRole: r.recorded_by_role ?? "",
    recordedByMe: r.recorded_by === viewerId,
    voidedByName: r.voided_by_name ?? "",
    voidReason: r.void_reason ?? "",
  }));
}

interface AlertRpcRow {
  patient_id: string;
  patient_name: string;
  patient_number: number;
  value_mgdl: number | string;
  context: GlucoseContext;
  measured_at: string;
}

/** Patients with an urgent reading in the last 48 hours (doctors and nurses only). */
export async function loadGlucoseAlerts(supabase: SupabaseClient, nowMs: number): Promise<GlucoseAlert[]> {
  const since = new Date(nowMs - 48 * 3_600_000).toISOString();
  const { data } = await supabase.rpc("glucose_recent_staff", { p_since: since });

  return buildGlucoseAlerts(
    ((data ?? []) as AlertRpcRow[]).map((r) => ({
      patientId: r.patient_id,
      patientName: r.patient_name,
      patientCode: patientCode(r.patient_number),
      mgdl: Number(r.value_mgdl),
      context: r.context,
      takenAt: r.measured_at,
    }))
  );
}
