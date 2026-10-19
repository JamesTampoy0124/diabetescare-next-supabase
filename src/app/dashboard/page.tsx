import type { Metadata } from "next";
import Link from "next/link";
import "@/styles/dashboard.css";
import { IdleTimeout } from "@/components/layout/IdleTimeout";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { requireProfile } from "@/lib/auth";
import { ROLES } from "@/lib/roles";

export const metadata: Metadata = { title: "DiabetesCare Dashboard" };

// All logged-in roles may open this page.
export default async function DashboardPage() {
  const profile = await requireProfile();

  return (
    <div className="dash-root">
      <header>
        <h2>♥ DiabetesCare</h2>

        <div>
          {profile.role === "admin" && (
            <Link href="/admin" style={{ color: "white", marginRight: 16, fontWeight: "bold" }}>
              Admin Panel
            </Link>
          )}

          <LogoutButton className="logout">Log Out</LogoutButton>
        </div>
      </header>

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
