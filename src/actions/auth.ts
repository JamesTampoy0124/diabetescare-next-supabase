"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clearAttempts, lockMinutesLeft, recordFailedAttempt } from "@/lib/login-attempts";
import { getOrigin } from "@/lib/origin";
import { ROLE_HOME } from "@/lib/roles";
import { firstError, str } from "@/lib/utils/form";
import { todayInClinicTz } from "@/lib/utils/format";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from "@/lib/validations/auth";
import type { ActionState } from "@/types/actions";
import type { UserRole } from "@/types/database";

// =========================
// LOGIN
// =========================

export async function login(formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({ email: str(formData, "email"), password: str(formData, "password") });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { email, password } = parsed.data;
  const admin = createAdminClient();

  const minutes = await lockMinutesLeft(admin, email);
  if (minutes > 0) {
    return { error: `Too many failed attempts. Try again in ${minutes} minute(s).` };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    if (error?.code === "email_not_confirmed") {
      return { error: "Please confirm your email address first. Check your inbox for the confirmation link." };
    }
    await recordFailedAttempt(admin, email);
    return { error: "Incorrect email or password." };
  }

  // Password is right, but an administrator may have switched the account off.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile || profile.active === false) {
    await supabase.auth.signOut({ scope: "local" });
    return { error: "This account has been deactivated. Please contact the clinic administrator." };
  }

  await clearAttempts(admin, email);

  // The browser navigates (see useFormSubmit). Calling redirect() here made the client treat it as an error.
  return { success: "Logged in.", redirectTo: ROLE_HOME[profile.role as UserRole] ?? "/dashboard" };
}

// =========================
// REGISTRATION (patients only)
// Staff accounts are created by an administrator in the admin panel.
// =========================

export async function register(formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    fullName: str(formData, "fullName"),
    birthDate: str(formData, "birthDate"),
    phone: str(formData, "phone"),
    email: str(formData, "email"),
    password: str(formData, "password"),
    confirmPassword: str(formData, "confirmPassword"),
    terms: formData.get("terms"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { fullName, birthDate, phone, email, password } = parsed.data;

  if (birthDate > todayInClinicTz()) {
    return { error: "Date of birth can't be in the future." };
  }

  // If the clinic already has an archived record for this email, registration is refused.
  const admin = createAdminClient();
  const { data: existing } = await admin.from("patients").select("status").eq("email", email).maybeSingle();

  if (existing?.status === "Inactive") {
    return { error: "This patient record is inactive. Please contact the clinic." };
  }

  const supabase = await createClient();
  const origin = await getOrigin();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Only harmless profile details here. The role is NOT taken from this data: new sign-ups are always patients.
      data: { full_name: fullName, birth_date: birthDate, phone },
      emailRedirectTo: `${origin}/auth/callback?next=/`,
    },
  });

  if (error) {
    if (error.code === "user_already_exists" || /already registered/i.test(error.message)) {
      return { error: "An account with this email already exists." };
    }
    if (error.code === "weak_password") {
      return { error: "That password is too weak. Please choose a stronger one." };
    }
    return { error: "We could not create your account. Please try again." };
  }

  // Email confirmation switched off in Supabase: a session is returned. Log out so the user logs in themselves.
  if (data.session) {
    await supabase.auth.signOut({ scope: "local" });
    return { success: "Registration successful! You can now log in." };
  }

  return { success: "Registration successful! Check your email to confirm your account, then log in." };
}

// =========================
// FORGOT / RESET PASSWORD
// =========================

export async function forgotPassword(formData: FormData): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: str(formData, "email") });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const origin = await getOrigin();

  // The answer is the same whether or not the email exists, so this form can't be used to find accounts.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  return { success: "If an account exists for that email, a password reset link has been sent." };
}

export async function resetPassword(formData: FormData): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    password: str(formData, "password"),
    confirmPassword: str(formData, "confirmPassword"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    if (error.code === "same_password") return { error: "Choose a password you haven't used before." };
    if (error.code === "weak_password") return { error: "That password is too weak. Please choose a stronger one." };
    return { error: "We could not update your password. The reset link may have expired - request a new one." };
  }

  return { success: "Password updated.", redirectTo: "/" };
}

// =========================
// LOGOUT
// =========================

async function endSession(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/login");
}

/** Called by the browser when the page has been idle for 5 minutes. */
export async function expireSession(): Promise<void> {
  await endSession();
  redirect("/login?reason=expired");
}