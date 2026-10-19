import { SettingsView } from "@/components/admin/SettingsView";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const profile = await requireProfile(["admin"]);

  const supabase = await createClient();
  const { data } = await supabase.from("system_settings").select("key, value");

  const flags = new Map((data ?? []).map((row) => [row.key as string, row.value as boolean]));

  return (
    <SettingsView
      name={profile.full_name}
      email={profile.email}
      settings={{
        email_notifications: flags.get("email_notifications") ?? true,
        automatic_backups: flags.get("automatic_backups") ?? true,
      }}
    />
  );
}
