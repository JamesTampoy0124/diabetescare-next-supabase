import { StaffView, type StaffRow } from "@/components/admin/StaffView";
import { requireProfile } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { initials } from "@/lib/utils/format";
import type { Profile } from "@/types/database";

export default async function StaffPage() {
  await requireProfile(["admin"]);

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, specialty, active")
    .neq("role", "patient")
    .order("created_at", { ascending: true });

  const people = (data ?? []) as Pick<Profile, "id" | "email" | "full_name" | "role" | "specialty" | "active">[];

  const staff: StaffRow[] = people.map((u) => ({
    id: u.id,
    name: u.full_name,
    email: u.email,
    initials: initials(u.full_name),
    detail: [ROLES[u.role] ?? u.role, u.specialty].filter(Boolean).join(" · "),
    active: u.active,
  }));

  return <StaffView staff={staff} />;
}
