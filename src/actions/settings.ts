"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveProfile, getAdminOrNull } from "@/lib/auth";
import { PANEL_ROLES } from "@/lib/roles";
import { getOrigin } from "@/lib/origin";
import { firstError, str } from "@/lib/utils/form";
import { changePasswordSchema } from "@/lib/validations/auth";
import { emailField } from "@/lib/validations/common";
import type { ActionState } from "@/types/actions";

const NOT_ALLOWED: ActionState = { error: "You do not have permission to do this." };

export async function updateOwnName(formData: FormData): Promise<ActionState> {
  const me = await getActiveProfile(PANEL_ROLES);
  if (!me) return NOT_ALLOWED;

  const name = str(formData, "name").trim();
  if (name.length < 2) return { error: "Please enter your full name." };
  if (name.length > 80) return { error: "Name is too long." };

  // Only the caller's own row, and only the name (RLS lets just the administrator edit profiles directly)
  const { error } = await createAdminClient().from("profiles").update({ full_name: name }).eq("id", me.id);
  if (error) return { error: "Something went wrong. Please try again." };

  revalidatePath("/admin", "layout");
  return { success: "Name updated." };
}

export async function updateOwnEmail(formData: FormData): Promise<ActionState> {
  if (!(await getActiveProfile(PANEL_ROLES))) return NOT_ALLOWED;

  const email = emailField.safeParse(str(formData, "email"));
  if (!email.success) return { error: firstError(email.error) };

  const supabase = await createClient();
  const origin = await getOrigin();
  const { error } = await supabase.auth.updateUser(
    { email: email.data },
    { emailRedirectTo: `${origin}/auth/callback?next=/admin/settings` }
  );

  if (error) {
    if (error.code === "email_exists") return { error: "An account with this email already exists." };
    return { error: "We could not change the email. Please try again." };
  }

  return { success: "A confirmation link was sent. Your email changes after you confirm it." };
}

export async function changeOwnPassword(formData: FormData): Promise<ActionState> {
  const me = await getActiveProfile(PANEL_ROLES);
  if (!me) return NOT_ALLOWED;

  const parsed = changePasswordSchema.safeParse({
    current: str(formData, "current"),
    next: str(formData, "next"),
    confirm: str(formData, "confirm"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();

  const check = await supabase.auth.signInWithPassword({ email: me.email, password: parsed.data.current });
  if (check.error) return { error: "Your current password is incorrect." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.next });
  if (error) {
    if (error.code === "same_password") return { error: "Choose a password you haven't used before." };
    if (error.code === "weak_password") return { error: "That password is too weak. Please choose a stronger one." };
    return { error: "We could not change the password. Please try again." };
  }

  return { success: "Your password has been changed." };
}

const SETTING_KEYS = ["email_notifications", "automatic_backups"];

export async function setSystemSetting(key: string, value: boolean): Promise<ActionState> {
  if (!(await getAdminOrNull())) return NOT_ALLOWED;
  if (!SETTING_KEYS.includes(key)) return { error: "Unknown setting." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("system_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() });

  if (error) return { error: "Something went wrong. Please try again." };

  revalidatePath("/admin/settings");
  return { success: "Setting saved." };
}
