import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/roles";

// "/" sends everybody to the right place: login, admin panel or dashboard.
export default async function Home() {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/auth/signout?reason=required");
  if (!profile.active) redirect("/auth/signout?reason=inactive");

  redirect(ROLE_HOME[profile.role] ?? "/dashboard");
}
