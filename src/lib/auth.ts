import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLE_HOME } from "@/lib/roles";
import type { Profile, UserRole } from "@/types/database";

const PROFILE_COLUMNS = "id, email, full_name, role, specialty, phone, birth_date, active, created_at";

/** The user id inside the login token (no network call). */
function userIdFromToken(token: string | undefined): string | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

/**
 * The logged-in user's profile, or null. Cached for the duration of one request.
 *
 * One database query instead of a call to Supabase Auth plus a query: the token is sent with the query,
 * and the database itself rejects a token that is forged or expired (the query then returns nothing).
 */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const userId = userIdFromToken(session?.access_token);
  if (!userId) return null;

  const { data } = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", userId).maybeSingle();

  return (data as Profile | null) ?? null;
});

/**
 * Use at the top of every protected page and Server Action.
 * (Layouts are not re-run on every client-side navigation, so the check must live in the page / action.)
 */
export async function requireProfile(allowed?: UserRole[]): Promise<Profile> {
  const profile = await getCurrentProfile();

  // No readable profile: clear the login cookie and go to /login. (Going straight to /login could loop,
  // because the middleware sends anyone who still has a login cookie back to "/".)
  if (!profile) redirect("/auth/signout?reason=required");
  if (!profile.active) redirect("/auth/signout?reason=inactive");
  if (allowed && !allowed.includes(profile.role)) redirect(ROLE_HOME[profile.role] ?? "/dashboard");

  return profile;
}

/** Same as requireProfile but for Server Actions that return an error message instead of redirecting. */
export async function getAdminOrNull(): Promise<Profile | null> {
  const profile = await getCurrentProfile();
  return profile && profile.active && profile.role === "admin" ? profile : null;
}

/** The active logged-in user if their role is one of `roles`, otherwise null (for Server Actions). */
export async function getActiveProfile(roles: UserRole[]): Promise<Profile | null> {
  const profile = await getCurrentProfile();
  return profile && profile.active && roles.includes(profile.role) ? profile : null;
}
