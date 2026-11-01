import { redirect } from "next/navigation";

// Doctors now manage their appointments in the admin panel.
export default function DoctorAppointmentsMoved() {
  redirect("/admin/appointments");
}
