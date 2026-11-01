"use client";

import { useState } from "react";
import { createAppointment, updateAppointmentStatus } from "@/actions/appointments";
import { DetailRow, Field, SelectField } from "@/components/ui/Fields";
import { ModalForm } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useFormSubmit } from "@/components/ui/useFormSubmit";
import type { AppointmentStatus } from "@/types/database";

export interface AppointmentRow {
  id: string;
  patient: string;
  doctor: string;
  dateLabel: string;
  timeLabel: string;
  status: AppointmentStatus;
  statusLabel: string;
  notes: string;
  meetingLink: string;
  /** Set for a doctor's confirmed appointments that have a meeting link: opens the video call. */
  joinHref?: string;
}

interface Option {
  value: string;
  label: string;
}

interface AppointmentsViewProps {
  rows: AppointmentRow[];
  patients: Option[];
  doctors: Option[];
  today: string;
  page: number;
  pageSize: number;
  total: number;
  /** Page address, used by the Previous / Next links. */
  basePath?: string;
  /** False = view only (nurses): no "New Appointment" button and no status changes. */
  canManage?: boolean;
}

function NewAppointmentModal({
  patients,
  doctors,
  today,
  onClose,
}: {
  patients: Option[];
  doctors: Option[];
  today: string;
  onClose: () => void;
}) {
  const { state, pending, submit } = useFormSubmit(createAppointment);
  const blocked = patients.length === 0 || doctors.length === 0;

  return (
    <ModalForm
      title="New Appointment"
      submitLabel="Create Appointment"
      onClose={onClose}
      onSubmit={blocked ? undefined : (e) => submit(e, onClose)}
      error={blocked ? "Add at least one active patient and one active doctor first." : state?.error}
      pending={pending}
    >
      <SelectField label="Patient" name="patientId" options={patients} required />
      <SelectField label="Doctor" name="doctorId" options={doctors} required />
      <Field label="Date" name="date" type="date" required min={today} defaultValue={today} />
      <Field label="Time" name="time" type="time" required defaultValue="09:00" />
      <Field label="Notes (optional)" name="notes" type="text" maxLength={500} />
      <Field
        label="Video meeting link (optional)"
        name="meetingLink"
        type="url"
        maxLength={500}
        placeholder="https://zoom.us/j/..."
        hint="Paste a Zoom, Google Meet or Teams link. The patient can join from it once the appointment is confirmed."
      />
    </ModalForm>
  );
}

function AppointmentDetailsModal({
  appointment,
  onClose,
  readOnly,
}: {
  appointment: AppointmentRow;
  onClose: () => void;
  readOnly: boolean;
}) {
  const { state, pending, submit } = useFormSubmit(updateAppointmentStatus);

  return (
    <ModalForm
      title="Appointment"
      submitLabel="Update Status"
      onClose={onClose}
      onSubmit={readOnly ? undefined : (e) => submit(e, onClose)}
      error={state?.error}
      pending={pending}
    >
      <input type="hidden" name="id" value={appointment.id} />
      <DetailRow label="Patient" value={appointment.patient} />
      <DetailRow label="Doctor" value={appointment.doctor} />
      <DetailRow label="Date" value={appointment.dateLabel} />
      <DetailRow label="Time" value={appointment.timeLabel} />
      <DetailRow label="Notes" value={appointment.notes || "-"} />
      {readOnly && <DetailRow label="Video meeting" value={appointment.meetingLink ? "Link added" : "-"} />}
      {readOnly ? (
        <DetailRow label="Status" value={appointment.statusLabel} />
      ) : (
      <div style={{ marginTop: 14 }}>
        <Field
          label="Video meeting link"
          name="meetingLink"
          type="url"
          defaultValue={appointment.meetingLink}
          maxLength={500}
          placeholder="https://zoom.us/j/..."
          hint="Leave empty for an in-person appointment."
        />
        <SelectField
          label="Status"
          name="status"
          defaultValue={appointment.status}
          options={[
            { value: "pending", label: "Pending" },
            { value: "confirmed", label: "Confirmed" },
            { value: "completed", label: "Completed" },
            { value: "cancelled", label: "Cancelled" },
          ]}
        />
      </div>
      )}
    </ModalForm>
  );
}

type ModalState = null | { mode: "new" } | { mode: "view"; appointment: AppointmentRow };

export function AppointmentsView({
  rows,
  patients,
  doctors,
  today,
  page,
  pageSize,
  total,
  basePath = "/admin/appointments",
  canManage = true,
}: AppointmentsViewProps) {
  const [modal, setModal] = useState<ModalState>(null);
  const close = () => setModal(null);

  return (
    <section className="page active-page">
      <div className="page-heading">
        <div>
          <h1>Appointments</h1>
          <p>Manage patient appointments.</p>
        </div>

        {canManage && (
          <button type="button" className="primary-btn" onClick={() => setModal({ mode: "new" })}>
            + New Appointment
          </button>
        )}
      </div>

      <div className="panel">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6}>No appointments yet.</td>
                </tr>
              ) : (
                rows.map((a) => (
                  <tr key={a.id}>
                    <td>{a.patient}</td>
                    <td>{a.doctor}</td>
                    <td>{a.dateLabel}</td>
                    <td>{a.timeLabel}</td>
                    <td>
                      <StatusBadge kind={a.status}>{a.statusLabel}</StatusBadge>
                    </td>
                    <td>
                      <button type="button" className="action-btn" onClick={() => setModal({ mode: "view", appointment: a })}>
                        View
                      </button>
                      {a.joinHref && (
                        <>
                          {" "}
                          <a className="action-btn" href={a.joinHref} target="_blank" rel="noopener noreferrer">
                            Join video call
                          </a>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination basePath={basePath} page={page} pageSize={pageSize} total={total} />
      </div>

      {modal?.mode === "new" && (
        <NewAppointmentModal patients={patients} doctors={doctors} today={today} onClose={close} />
      )}
      {modal?.mode === "view" && (
        <AppointmentDetailsModal appointment={modal.appointment} onClose={close} readOnly={!canManage} />
      )}
    </section>
  );
}
