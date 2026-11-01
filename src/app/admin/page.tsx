import Link from "next/link";
import { StatCard } from "@/components/admin/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { requireProfile } from "@/lib/auth";
import { PANEL_ROLES } from "@/lib/roles";

import { createClient } from "@/lib/supabase/server";
import { dateBox, formatDate, formatTime, monthRange, todayInClinicTz } from "@/lib/utils/format";
import type { Appointment, Patient } from "@/types/database";

export default async function AdminDashboardPage() {
  await requireProfile(PANEL_ROLES);

  const supabase = await createClient();
  const today = todayInClinicTz();
  const { first, last } = monthRange(today);

  const [patients, staff, monthAppointments, reports, recent, upcoming] = await Promise.all([
    supabase.from("patients").select("id", { count: "exact", head: true }).eq("status", "Active"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).neq("role", "patient").eq("active", true),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .gte("appointment_date", first)
      .lte("appointment_date", last),
    supabase.from("reports").select("id", { count: "exact", head: true }),
    supabase
      .from("patients")
      .select("id, name, email, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("appointments")
      .select(
        "id, appointment_date, appointment_time, status, patient:patients(id, patient_number, name), doctor:profiles!appointments_doctor_id_fkey(id, full_name)"
      )
      .gte("appointment_date", today)
      .in("status", ["pending", "confirmed"])
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true })
      .limit(3),
  ]);

  const recentPatients = (recent.data ?? []) as Pick<Patient, "id" | "name" | "email" | "status" | "created_at">[];
  const upcomingAppointments = (upcoming.data ?? []) as unknown as Appointment[];

  return (
    <section className="page active-page">
      <div className="page-heading">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of your DiabetesCare system.</p>
        </div>

        {/* <Link href="/admin/patients" className="primary-btn">
          + Add Patient
        </Link> */}
      </div>

      {/* STAT CARDS */}
      <div className="stats">
        <StatCard color="green" icon="♟" label="Total Patients" value={patients.count ?? 0} caption="Registered patients" />
        <StatCard color="blue" icon="⚕" label="Staff" value={staff.count ?? 0} caption="Active staff accounts" />
        <StatCard
          color="orange"
          icon="▣"
          label="Appointments"
          value={monthAppointments.count ?? 0}
          caption="This month"
        />
        <StatCard color="purple" icon="▥" label="Reports" value={reports.count ?? 0} caption="Generated reports" />
      </div>

      {/* DASHBOARD GRID */}
      <div className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <h3>Recent Patients</h3>
            <Link href="/admin/patients">View All</Link>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Registered</th>
                </tr>
              </thead>

              <tbody>
                {recentPatients.length === 0 ? (
                  <tr>
                    <td colSpan={4}>No patients yet.</td>
                  </tr>
                ) : (
                  recentPatients.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.name}</strong>
                      </td>
                      <td>{p.email || "-"}</td>
                      <td>
                        <StatusBadge kind={p.status === "Active" ? "active" : "inactive"}>{p.status}</StatusBadge>
                      </td>
                      <td>{formatDate(p.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Upcoming Appointments</h3>
            <Link href="/admin/appointments">View All</Link>
          </div>

          <div className="appointment-list">
            {upcomingAppointments.length === 0 && <p className="empty-state">No upcoming appointments.</p>}

            {upcomingAppointments.map((a) => {
              const box = dateBox(a.appointment_date);
              return (
                <div className="appointment" key={a.id}>
                  <div className="date-box">
                    <strong>{box.day}</strong>
                    <span>{box.month}</span>
                  </div>

                  <div>
                    <strong>{a.patient?.name ?? "Unknown patient"}</strong>
                    <p>
                      {a.doctor ? `Dr. ${a.doctor.full_name.replace(/^dr\.?\s+/i, "")}` : "No doctor"} · {formatTime(a.appointment_time)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
