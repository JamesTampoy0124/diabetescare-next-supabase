import type { Metadata } from "next";
import { GlucoseDashboard } from "@/components/glucose/GlucoseDashboard";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { IdleTimeout } from "@/components/layout/IdleTimeout";
import { requireProfile } from "@/lib/auth";
import { loadGlucoseReadings } from "@/lib/data/glucose";
import { createClient } from "@/lib/supabase/server";
import { patientCode } from "@/lib/utils/format";
import { getClinicTimeZone } from "@/lib/utils/timezone";

export const metadata: Metadata = { title: "DiabetesCare - Blood Glucose" };

// Patients record and see their own readings. (Doctors and nurses use Admin Panel -> Glucose.)
export default async function PatientGlucosePage() {
  const me = await requireProfile(["patient"]);
  const supabase = await createClient();

  const { data: own } = await supabase
    .from("patients")
    .select("id, patient_number, name, status")
    .eq("profile_id", me.id)
    .maybeSingle();

  const now = Date.now();
  const active = own && own.status === "Active" ? own : null;
  const readings = active ? await loadGlucoseReadings(supabase, active.id, now, me.id) : [];

  return (
    <div className="dash-root">
      <DashboardHeader role={me.role} />

      <main>
        <GlucoseDashboard
          isStaff={false}
          patient={active ? { id: active.id, label: `${active.name} (${patientCode(active.patient_number)})` } : null}
          patients={[]}
          readings={readings}
          alerts={[]}
          now={now}
          timeZone={getClinicTimeZone()}
          basePath="/patient/glucose"
        />
      </main>

      <IdleTimeout />
    </div>
  );
}
