import { MarkAllReadButton } from "@/components/admin/MarkAllReadButton";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/utils/format";
import type { AppNotification } from "@/types/database";

export default async function NotificationsPage() {
  await requireProfile(["admin"]);

  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, title, message, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const notifications = (data ?? []) as AppNotification[];
  const hasUnread = notifications.some((n) => n.read_at === null);

  return (
    <section className="page active-page">
      <div className="page-heading">
        <div>
          <h1>Notifications</h1>
          <p>System alerts and notifications.</p>
        </div>

        <MarkAllReadButton disabled={!hasUnread} />
      </div>

      <div className="panel notification-panel">
        {notifications.length === 0 && <p className="empty-state">No notifications yet.</p>}

        {notifications.map((n) => (
          <div className={`system-notification${n.read_at === null ? " unread" : ""}`} key={n.id}>
            <strong>{n.title}</strong>
            <p>{n.message}</p>
            <small>{timeAgo(n.created_at)}</small>
          </div>
        ))}
      </div>
    </section>
  );
}
