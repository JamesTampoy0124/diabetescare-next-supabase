import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { IdleTimeout } from "@/components/layout/IdleTimeout";
import { requireProfile } from "@/lib/auth";
import { ROLES } from "@/lib/roles";

export const metadata: Metadata = { title: "DiabetesCare Dashboard" };

// Dashboard for front desk (admins can open it too). Patients use /patient; doctors and nurses use /admin.
export default async function DashboardPage() {
  const profile = await requireProfile();

  if (profile.role === "patient") redirect("/patient");
  // Doctors and nurses work in the admin panel (without Staff management)
  if (profile.role === "doctor" || profile.role === "nurse") redirect("/admin");

  return (
    <div className="dash-root">
      <DashboardHeader role={profile.role} />

      <main>
        <div className="welcome">
          <h1>Dashboard</h1>
          <p>
            Welcome back, {profile.full_name} ({ROLES[profile.role] ?? profile.role})!
          </p>
        </div>

        <div className="cards">
          <div className="card">
            <h3>Blood Glucose</h3>
            <p>Record and monitor your blood sugar levels.</p>
          </div>

          <div className="card">
            <h3>Medications</h3>
            <p>Manage your medication schedule.</p>
          </div>

          <div className="card">
            <h3>Diet</h3>
            <p>Track meals and nutritional information.</p>
          </div>

          <div className="card">
            <h3>Appointments</h3>
            <p>View and manage your appointments.</p>
          </div>
        </div>
      </main>

      <IdleTimeout />
    </div>
  );
}
