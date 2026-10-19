import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./config";

// Service-role client: bypasses RLS. SERVER ONLY. Used for Auth admin tasks
// (creating staff logins, resetting passwords) and the login_attempts table.
export function createAdminClient() {
  const { url } = getSupabaseConfig();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey || serviceKey.includes("YOUR_SERVICE_ROLE_KEY")) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set in .env.local.");
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
