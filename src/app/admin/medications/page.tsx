import { MedicationsView } from "@/components/admin/MedicationsView";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Medication } from "@/types/database";

export default async function MedicationsPage() {
  await requireProfile(["admin"]);

  const supabase = await createClient();
  const { data } = await supabase
    .from("medications")
    .select("id, name, description, dosage, status")
    .order("name", { ascending: true });

  return <MedicationsView medications={(data ?? []) as Medication[]} />;
}
