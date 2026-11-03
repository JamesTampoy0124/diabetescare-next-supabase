import type { Metadata } from "next";
import "@/styles/admin.css";
import { AdminShell } from "@/components/layout/AdminShell";
import { IdleTimeout } from "@/components/layout/IdleTimeout";
import { ReminderRefresh } from "@/components/layout/ReminderRefresh";
import { requireProfile } from "@/lib/auth";
import { PANEL_ROLES } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { initials } from "@/lib/utils/format";

export const metadata: Metadata = { title: "DiabetesCare - Admin Panel" };

// Admin, doctor and nurse may open this area (Staff management is admin-only). Every page and action checks again; RLS is the last line.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  // Counts only what this person may see (admin: system notifications, doctor: their own reminders)
  const countUnread = () =>
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);

  // Both run at the same time instead of one after the other
  const [profile, first] = await Promise.all([requireProfile(PANEL_ROLES), countUnread()]);
  let unreadCount = first.count ?? 0;

  // Doctors: create the appointment reminders that are due (tomorrow / starting within 30 minutes), then count again
  if (profile.role === "doctor") {
    await supabase.rpc("create_my_appointment_reminders");
    unreadCount = (await countUnread()).count ?? 0;
  }

  return (
    <div className="admin-root">
      <AdminShell role={profile.role} name={profile.full_name} initials={initials(profile.full_name)} unreadCount={unreadCount}>
        {children}
      </AdminShell>
      <IdleTimeout />
      {profile.role === "doctor" && <ReminderRefresh />}
    </div>
  );
}
