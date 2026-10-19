import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Server-side version of the original 5-attempts / 5-minutes lock.
// Stored in public.login_attempts, which only the service-role key can touch.
export const MAX_ATTEMPTS = 5;
export const LOCK_MINUTES = 5;

export async function lockMinutesLeft(admin: SupabaseClient, email: string): Promise<number> {
  const { data } = await admin.from("login_attempts").select("locked_until").eq("email", email).maybeSingle();

  if (data?.locked_until) {
    const until = new Date(data.locked_until as string).getTime();
    if (until > Date.now()) return Math.ceil((until - Date.now()) / 60000);
  }
  return 0;
}

export async function recordFailedAttempt(admin: SupabaseClient, email: string): Promise<void> {
  const { data } = await admin.from("login_attempts").select("fail_count").eq("email", email).maybeSingle();

  const count = ((data?.fail_count as number | undefined) ?? 0) + 1;
  const lock = count >= MAX_ATTEMPTS;

  await admin.from("login_attempts").upsert({
    email,
    fail_count: lock ? 0 : count,
    locked_until: lock ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() : null,
    updated_at: new Date().toISOString(),
  });
}

export async function clearAttempts(admin: SupabaseClient, email: string): Promise<void> {
  await admin.from("login_attempts").delete().eq("email", email);
}
