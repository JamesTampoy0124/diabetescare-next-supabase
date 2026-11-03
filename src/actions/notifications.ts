"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveProfile } from "@/lib/auth";
import type { ActionState } from "@/types/actions";

/** Administrators mark the system notifications as read; doctors mark their own reminders. */
export async function markAllNotificationsRead(): Promise<ActionState> {
  const me = await getActiveProfile(["admin", "doctor"]);
  if (!me) return { error: "You do not have permission to do this." };

  const supabase = await createClient();

  const base = supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  const { error } = me.role === "admin" ? await base.is("recipient_id", null) : await base.eq("recipient_id", me.id);

  if (error) return { error: "Something went wrong. Please try again." };

  revalidatePath("/admin", "layout");
  return { success: "All notifications marked as read." };
}
