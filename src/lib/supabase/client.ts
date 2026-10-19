import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";

// Browser client. The app itself does all reads/writes on the server (Server Components and
// Server Actions); use this only for browser-only needs such as realtime subscriptions.
export function createClient() {
  const { url, key } = getSupabaseConfig();
  return createBrowserClient(url, key);
}
