import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { todayInClinicTz } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Diabetes Care - Create Account" };

// The date-of-birth limit is "today", so this page must not be generated once at build time.
export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return <RegisterForm today={todayInClinicTz()} />;
}
