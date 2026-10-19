import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Used when the server has to end a session (for example a deactivated account).
export async function GET(request: NextRequest) {
  const reason = request.nextUrl.searchParams.get("reason");
  const safeReason = reason === "inactive" || reason === "expired" || reason === "required" ? reason : null;

  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });

  return NextResponse.redirect(new URL(safeReason ? `/login?reason=${safeReason}` : "/login", request.url));
}
