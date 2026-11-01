import { SettingsView } from "@/components/admin/SettingsView";
import { requireProfile } from "@/lib/auth";
import { PANEL_ROLES } from "@/lib/roles";

import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const profile = await requireProfile(PANEL_ROLES);

  const supabase = await createClient();
  const { data } = await supabase.from("system_settings").select("key, value");

  const flags = new Map((data ?? []).map((row) => [row.key as string, row.value as boolean]));

  return (
    <SettingsView
      name={profile.full_name}
      email={profile.email}
      isAdmin={profile.role === "admin"}
      settings={{
        email_notifications: flags.get("email_notifications") ?? true,
        automatic_backups: flags.get("automatic_backups") ?? true,
      }}
    />
  );
}
