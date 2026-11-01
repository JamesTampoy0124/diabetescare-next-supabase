import type { Metadata } from "next";
import "@/styles/admin.css";
import { AdminShell } from "@/components/layout/AdminShell";
import { IdleTimeout } from "@/components/layout/IdleTimeout";
import { requireProfile } from "@/lib/auth";
import { PANEL_ROLES } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { initials } from "@/lib/utils/format";

export const metadata: Metadata = { title: "DiabetesCare - Admin Panel" };

// Admin, doctor and nurse may open this area (Staff management is admin-only). Every page and action checks again; RLS is the last line.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  // Both run at the same time instead of one after the other
  const [profile, unread] = await Promise.all([
    requireProfile(PANEL_ROLES),
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
  ]);

  return (
    <div className="admin-root">
      <AdminShell role={profile.role} name={profile.full_name} initials={initials(profile.full_name)} unreadCount={unread.count ?? 0}>
        {children}
      </AdminShell>
      <IdleTimeout />
    </div>
  );
}
