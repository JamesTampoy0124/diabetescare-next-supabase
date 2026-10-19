"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminOrNull } from "@/lib/auth";
import { clearAttempts } from "@/lib/login-attempts";
import { firstError, str } from "@/lib/utils/form";
import { passwordField, uuidField } from "@/lib/validations/common";
import { staffSchema } from "@/lib/validations/records";
import type { ActionState } from "@/types/actions";

const NOT_ALLOWED: ActionState = { error: "You do not have permission to do this." };

function refresh() {
  revalidatePath("/admin", "layout");
}

export async function createStaff(formData: FormData): Promise<ActionState> {
  const me = await getAdminOrNull();
  if (!me) return NOT_ALLOWED;

  const parsed = staffSchema.safeParse({
    name: str(formData, "name"),
    email: str(formData, "email"),
    role: str(formData, "role"),
    specialty: str(formData, "specialty"),
    password: str(formData, "password"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { name, email, role, specialty, password } = parsed.data;

  const admin = createAdminClient();

  // A patient record that already uses this email would get linked to the new login. Stop that here.
  const { data: patientWithEmail } = await admin.from("patients").select("id").eq("email", email).maybeSingle();
  if (patientWithEmail) return { error: "That email already belongs to a patient record. Use a different email." };

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
    app_metadata: { role, specialty, created_by: me.id },
  });

  if (error || !data.user) {
    if (error?.code === "email_exists" || /already (been )?registered/i.test(error?.message ?? "")) {
      return { error: "An account with this email already exists." };
    }
    if (error?.code === "weak_password") return { error: "That password is too weak. Please choose a stronger one." };
    return { error: "We could not create the account. Please try again." };
  }

  const newId = data.user.id;

  // Logins created through the Auth API end up as patients: the database trigger that builds the profile does not
  // get the role from app_metadata, so it also adds a patient record and a "new patient" notification.
  // Set the real role explicitly, then remove what the trigger made by mistake.
  const { error: fixError } = await admin
    .from("profiles")
    .update({ role, specialty, created_by: me.id, active: true })
    .eq("id", newId);

  if (fixError) {
    // Don't leave a half-created login behind
    await admin.from("patients").delete().eq("profile_id", newId);
    await admin.auth.admin.deleteUser(newId);
    return { error: "We could not create the account. Please try again." };
  }

  await admin.from("patients").delete().eq("profile_id", newId);

  const { data: stray } = await admin
    .from("notifications")
    .select("id")
    .eq("title", "New patient registered")
    .eq("message", "A new patient has created an account.")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (stray) await admin.from("notifications").delete().eq("id", stray.id);

  refresh();
  return { success: "Staff account created." };
}

export async function setStaffActive(staffId: string, active: boolean): Promise<ActionState> {
  const me = await getAdminOrNull();
  if (!me) return NOT_ALLOWED;

  const id = uuidField.safeParse(staffId);
  if (!id.success) return { error: "Account not found." };

  const supabase = await createClient();

  const { data: target } = await supabase.from("profiles").select("id, role, active").eq("id", id.data).maybeSingle();
  if (!target || target.role === "patient") return { error: "Account not found." };

  if (!active) {
    if (target.id === me.id) {
      return { error: "You can't deactivate the account you are logged in with." };
    }

    if (target.role === "admin") {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin")
        .eq("active", true);

      if ((count ?? 0) <= 1) {
        return { error: "This is the only active administrator. Create another administrator first." };
      }
    }
  }

  const { error } = await supabase.from("profiles").update({ active }).eq("id", id.data);
  if (error) return { error: "Something went wrong. Please try again." };

  refresh();
  return { success: active ? "Account activated." : "Account deactivated." };
}

export async function resetStaffPassword(formData: FormData): Promise<ActionState> {
  if (!(await getAdminOrNull())) return NOT_ALLOWED;

  const id = uuidField.safeParse(str(formData, "id"));
  if (!id.success) return { error: "Account not found." };

  const password = passwordField.safeParse(str(formData, "password"));
  if (!password.success) return { error: firstError(password.error) };

  const supabase = await createClient();
  const { data: target } = await supabase.from("profiles").select("id, email, role").eq("id", id.data).maybeSingle();
  if (!target || target.role === "patient") return { error: "Account not found." };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id.data, { password: password.data });

  if (error) {
    if (error.code === "weak_password") return { error: "That password is too weak. Please choose a stronger one." };
    return { error: "We could not reset the password. Please try again." };
  }

  // Also lift any login lock
  await clearAttempts(admin, target.email as string);

  return { success: "Password reset." };
}
