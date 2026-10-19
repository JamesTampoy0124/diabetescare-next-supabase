import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { getCurrentProfile } from "@/lib/auth";

export const metadata: Metadata = { title: "Diabetes Care - Reset Password" };

// Opened from the link in the reset email. That link logs the person in (see /auth/callback),
// so a visitor without a session has nothing to reset.
export default async function ResetPasswordPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?reason=link");

  return <ResetPasswordForm />;
}
