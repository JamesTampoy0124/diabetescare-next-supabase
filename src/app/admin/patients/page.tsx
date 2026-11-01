import { PatientsView, type PatientRow } from "@/components/admin/PatientsView";
import { requireProfile } from "@/lib/auth";
import { PANEL_ROLES } from "@/lib/roles";

import { createClient } from "@/lib/supabase/server";
import { formatDate, patientCode, todayInClinicTz } from "@/lib/utils/format";
import type { Patient } from "@/types/database";

const PAGE_SIZE = 20;

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const me = await requireProfile(PANEL_ROLES);

  const { q = "", status = "", page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();

  let query = supabase
    .from("patients")
    .select("id, patient_number, name, email, phone, birth_date, blood_pressure, hip_cm, waist_cm, philhealth_number, status, source, profile_id, created_at", {
      count: "exact",
    })
    .order("patient_number", { ascending: true })
    .range(from, from + PAGE_SIZE - 1);

  if (status === "Active" || status === "Inactive") {
    query = query.eq("status", status);
  }

  // Characters that have a meaning inside a PostgREST filter are removed from the search text.
  const term = q.replace(/[,()*%\\"]/g, " ").trim();

  if (term) {
    const filters = [`name.ilike.%${term}%`, `email.ilike.%${term}%`, `phone.ilike.%${term}%`];
    const numberMatch = term.match(/^p?0*(\d{1,9})$/i);
    if (numberMatch) filters.push(`patient_number.eq.${numberMatch[1]}`);
    query = query.or(filters.join(","));
  }

  const { data, count } = await query;

  const rows: PatientRow[] = ((data ?? []) as Patient[]).map((p) => ({
    id: p.id,
    code: patientCode(p.patient_number),
    name: p.name,
    email: p.email,
    phone: p.phone,
    birthDate: p.birth_date ?? "",
    bloodPressure: p.blood_pressure ?? "",
    hipCm: p.hip_cm === null || p.hip_cm === undefined ? "" : String(p.hip_cm),
    waistCm: p.waist_cm === null || p.waist_cm === undefined ? "" : String(p.waist_cm),
    philhealth: p.philhealth_number ?? "",
    status: p.status,
    hasLogin: p.profile_id !== null,
    addedBy: p.source === "admin" ? "By staff" : "Self-registered",
    registered: formatDate(p.created_at),
  }));

  return (
    <PatientsView
      rows={rows}
      total={count ?? 0}
      page={page}
      pageSize={PAGE_SIZE}
      q={q}
      status={status}
      today={todayInClinicTz()}
      canArchive={me.role === "admin"}
      canResetPassword={me.role === "admin"}
    />
  );
}
