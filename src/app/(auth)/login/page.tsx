import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";
import { LOGIN_NOTICES } from "@/lib/session";

export const metadata: Metadata = { title: "Diabetes Care - Login & Registration" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  return <LoginForm notice={reason ? LOGIN_NOTICES[reason] : undefined} />;
}
