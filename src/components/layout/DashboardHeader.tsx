import Link from "next/link";
import "@/styles/dashboard.css";
import { LogoutButton } from "@/components/layout/LogoutButton";
import type { UserRole } from "@/types/database";

/** Green top bar shared by the dashboard, the doctor's appointments and the patient portal. */
export function DashboardHeader({ role }: { role: UserRole }) {
  const linkStyle = { color: "white", marginRight: 16, fontWeight: "bold" } as const;

  return (
    <header>
      <h2>♥ DiabetesCare</h2>

      <div>
        {role === "admin" && (
          <Link href="/admin" style={linkStyle}>
            Admin Panel
          </Link>
        )}

        {role === "patient" && (
          <>
            <Link href="/patient" style={linkStyle}>
              My Appointments
            </Link>
            <Link href="/patient/glucose" style={linkStyle}>
              Blood Glucose
            </Link>
          </>
        )}


        <LogoutButton className="logout">Log Out</LogoutButton>
      </div>
    </header>
  );
}
