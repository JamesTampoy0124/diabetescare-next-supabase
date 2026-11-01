import { GlucoseDashboard } from "@/components/glucose/GlucoseDashboard";
import { requireProfile } from "@/lib/auth";
import { loadGlucoseAlerts, loadGlucoseReadings } from "@/lib/data/glucose";
import { createClient } from "@/lib/supabase/server";
import { patientCode } from "@/lib/utils/format";
import { getClinicTimeZone } from "@/lib/utils/timezone";

// Doctors and nurses record and review blood glucose for every patient.
// (Administrators and front desk don't see individual readings; the Glucose report shows totals.)
export default async function AdminGlucosePage({ searchParams }: { searchParams: Promise<{ patient?: string }> }) {
  const me = await requireProfile(["doctor", "nurse"]);
  const { patient: patientParam } = await searchParams;

  const supabase = await createClient();
  const now = Date.now();

  const [list, alerts] = await Promise.all([
    supabase.from("patients").select("id, patient_number, name").eq("status", "Active").order("name").limit(500),
    loadGlucoseAlerts(supabase, now),
  ]);

  const patients = ((list.data ?? []) as { id: string; patient_number: number; name: string }[]).map((p) => ({
    id: p.id,
    label: `${p.name} (${patientCode(p.patient_number)})`,
  }));

  // The patient in the address, else one who needs attention, else the first in the list
  const selectedId =
    (patientParam && patients.some((p) => p.id === patientParam) ? patientParam : null) ??
    alerts.find((a) => patients.some((p) => p.id === a.patientId))?.patientId ??
    patients[0]?.id ??
    null;

  const selected = patients.find((p) => p.id === selectedId) ?? null;
  const readings = selected ? await loadGlucoseReadings(supabase, selected.id, now, me.id) : [];

  return (
    <section className="page active-page">
      <GlucoseDashboard
        isStaff
        patient={selected}
        patients={patients}
        readings={readings}
        alerts={alerts}
        now={now}
        timeZone={getClinicTimeZone()}
        basePath="/admin/glucose"
      />
    </section>
  );
}
