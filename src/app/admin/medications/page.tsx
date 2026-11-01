import { MedicationsView } from "@/components/admin/MedicationsView";
import { requireProfile } from "@/lib/auth";
import { PANEL_ROLES } from "@/lib/roles";

import { createClient } from "@/lib/supabase/server";
import type { Medication } from "@/types/database";

export default async function MedicationsPage() {
  const me = await requireProfile(PANEL_ROLES);

  const supabase = await createClient();
  const { data } = await supabase
    .from("medications")
    .select("id, name, description, dosage, status")
    .order("name", { ascending: true });

  return <MedicationsView medications={(data ?? []) as Medication[]} canAdd={me.role === "admin" || me.role === "doctor"} />;
}
