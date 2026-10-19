import type { Metadata } from "next";
import "@/styles/admin.css";
import { AdminShell } from "@/components/layout/AdminShell";
import { IdleTimeout } from "@/components/layout/IdleTimeout";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { initials } from "@/lib/utils/format";

export const metadata: Metadata = { title: "DiabetesCare - Admin Panel" };

// Only administrators may open this area (every page and action checks again; RLS is the last line).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  // Both run at the same time instead of one after the other
  const [profile, unread] = await Promise.all([
    requireProfile(["admin"]),
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
  ]);

  return (
    <div className="admin-root">
      <AdminShell name={profile.full_name} initials={initials(profile.full_name)} unreadCount={unread.count ?? 0}>
        {children}
      </AdminShell>
      <IdleTimeout />
    </div>
  );
}
