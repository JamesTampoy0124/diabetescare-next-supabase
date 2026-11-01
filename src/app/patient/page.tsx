import type { Metadata } from "next";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { IdleTimeout } from "@/components/layout/IdleTimeout";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { APPOINTMENT_STATUS_LABEL, formatPlainDate, formatTime, todayInClinicTz } from "@/lib/utils/format";
import type { AppointmentStatus } from "@/types/database";

export const metadata: Metadata = { title: "DiabetesCare - My Appointments" };

interface MyAppointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: AppointmentStatus;
  notes: string;
  doctor_name: string | null;
  meeting_link: string;
}

function AppointmentRow({ a, today }: { a: MyAppointment; today: string }) {
  return (
    <div className="appt-row">
      <div>
        <strong>
          {formatPlainDate(a.appointment_date)} · {formatTime(a.appointment_time)}
        </strong>
        <p className="muted">
          {a.doctor_name ? `Dr. ${a.doctor_name.replace(/^dr\.?\s+/i, "")}` : "Doctor to be assigned"}
          {a.notes ? ` · ${a.notes}` : ""}
        </p>
        {a.status === "confirmed" && a.meeting_link && a.appointment_date > today && (
          <p className="muted">Video call opens on the appointment day.</p>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {a.status === "confirmed" && a.meeting_link && a.appointment_date === today && (
          <a
            href={a.meeting_link}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#087f5b", fontWeight: "bold", fontSize: 13 }}
          >
            Join video call
          </a>
        )}
        <span className={`pill ${a.status}`}>{APPOINTMENT_STATUS_LABEL[a.status]}</span>
      </div>
    </div>
  );
}

// Patient portal: patients can only VIEW their appointments. Admins and doctors create and update them.
export default async function PatientPage() {
  const profile = await requireProfile(["patient"]);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_appointments");

  const all = (data ?? []) as MyAppointment[];
  const today = todayInClinicTz();

  const isOpen = (a: MyAppointment) => a.status === "pending" || a.status === "confirmed";
  const upcoming = all
    .filter((a) => a.appointment_date >= today && isOpen(a))
    .sort((x, y) => (x.appointment_date + x.appointment_time).localeCompare(y.appointment_date + y.appointment_time));
  const history = all.filter((a) => !upcoming.includes(a));

  return (
    <div className="dash-root">
      <DashboardHeader role={profile.role} />

      <main>
        <div className="welcome">
          <h1>My Appointments</h1>
          <p>Welcome back, {profile.full_name}! Your clinic schedules your appointments and they appear here.</p>
        </div>

        {error && (
          <div className="card" style={{ marginBottom: 20 }}>
            <p>Your appointments could not be loaded right now. Please refresh the page.</p>
          </div>
        )}

        <div className="card appt-section">
          <h3>Upcoming</h3>
          {upcoming.length === 0 && <p className="muted">You have no upcoming appointments.</p>}
          {upcoming.map((a) => (
            <AppointmentRow key={a.id} a={a} today={today} />
          ))}
        </div>

        <div className="card appt-section">
          <h3>Past and cancelled</h3>
          {history.length === 0 && <p className="muted">Nothing here yet.</p>}
          {history.map((a) => (
            <AppointmentRow key={a.id} a={a} today={today} />
          ))}
        </div>
      </main>

      <IdleTimeout />
    </div>
  );
}
