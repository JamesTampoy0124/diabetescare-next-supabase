"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAdminOrNull } from "@/lib/auth";
import type { ActionState } from "@/types/actions";

export async function markAllNotificationsRead(): Promise<ActionState> {
  if (!(await getAdminOrNull())) return { error: "You do not have permission to do this." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);

  if (error) return { error: "Something went wrong. Please try again." };

  revalidatePath("/admin", "layout");
  return { success: "All notifications marked as read." };
}
