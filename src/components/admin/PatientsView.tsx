"use client";

import { useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  createLoginForPatient,
  createPatient,
  resetPatientPassword,
  setPatientArchived,
  updatePatient,
} from "@/actions/patients";
import { DetailRow, Field } from "@/components/ui/Fields";
import { ModalForm } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useFormSubmit } from "@/components/ui/useFormSubmit";
import { ageFromBirthDate, ageLabel, formatPhilhealth } from "@/lib/utils/patient";

/** A patient as shown in the table (dates are already formatted on the server). */
export interface PatientRow {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  bloodPressure: string;
  hipCm: string;
  waistCm: string;
  philhealth: string;
  status: "Active" | "Inactive";
  hasLogin: boolean;
  addedBy: string;
  registered: string;
}

type ModalState = null | { mode: "add" } | { mode: "view" | "edit" | "login" | "reset"; patient: PatientRow };

interface PatientsViewProps {
  rows: PatientRow[];
  total: number;
  page: number;
  pageSize: number;
  q: string;
  status: string;
  today: string;
  /** Archiving a patient also switches their login off, so only the administrator may do it. */
  canArchive: boolean;
  /** Only the administrator may set a new password for a patient. */
  canResetPassword: boolean;
}

function PatientFields({ patient, today }: { patient?: PatientRow; today: string }) {
  const emailLocked = !!patient?.hasLogin;

  // Age is worked out from the date of birth as soon as one is picked (it is not saved; it is always calculated)
  const [birthDate, setBirthDate] = useState(patient?.birthDate ?? "");
  const age = ageFromBirthDate(birthDate, today);

  return (
    <>
      <Field label="Full name" name="name" type="text" defaultValue={patient?.name} required maxLength={80} />
      <Field
        label="Date of birth"
        name="birthDate"
        type="date"
        value={birthDate}
        onChange={(e) => setBirthDate(e.target.value)}
        required
        min="1900-01-01"
        max={today}
      />
      <Field
        label="Age"
        name="age"
        type="text"
        value={ageLabel(age)}
        readOnly
        tabIndex={-1}
        placeholder="Filled in from the date of birth"
      />
      <Field
        label="Contact number"
        name="phone"
        type="tel"
        defaultValue={patient?.phone}
        required
        placeholder="09XXXXXXXXX"
      />
      <Field
        label="Email (optional)"
        name="email"
        type="email"
        defaultValue={patient?.email}
        readOnly={emailLocked}
        hint={emailLocked ? "This patient has a login, so the email can't be changed here." : undefined}
      />
      <Field
        label="Blood pressure (mmHg)"
        name="bloodPressure"
        type="text"
        defaultValue={patient?.bloodPressure}
        placeholder="e.g. 120/80"
        inputMode="numeric"
        maxLength={7}
        pattern="[0-9]{2,3}/[0-9]{2,3}"
        title="Systolic/diastolic, for example 120/80"
      />
      <Field
        label="Hip measurement (cm)"
        name="hipCm"
        type="number"
        defaultValue={patient?.hipCm}
        placeholder="e.g. 98.5"
        min="20"
        max="300"
        step="0.1"
      />
      <Field
        label="Waist measurement (cm)"
        name="waistCm"
        type="number"
        defaultValue={patient?.waistCm}
        placeholder="e.g. 82"
        min="20"
        max="300"
        step="0.1"
      />
      <Field
        label="PhilHealth number (optional)"
        name="philhealth"
        type="text"
        defaultValue={patient ? formatPhilhealth(patient.philhealth) : ""}
        placeholder="e.g. 01-234567890-1"
        inputMode="numeric"
        maxLength={14}
        pattern="[0-9]{2}[ -]?[0-9]{9}[ -]?[0-9]"
        title="12 digits, for example 01-234567890-1"
      />
    </>
  );
}

function AddPatientModal({ today, onClose }: { today: string; onClose: () => void }) {
  const { state, pending, submit } = useFormSubmit(createPatient);
  const [withLogin, setWithLogin] = useState(false);

  return (
    <ModalForm
      title="Add Patient"
      submitLabel="Add Patient"
      onClose={onClose}
      onSubmit={(e) => submit(e, onClose)}
      error={state?.error}
      pending={pending}
    >
      <PatientFields today={today} />

      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, margin: "6px 0 12px" }}>
        <input type="checkbox" name="createLogin" checked={withLogin} onChange={(e) => setWithLogin(e.target.checked)} />
        Create a login so the patient can use the patient portal
      </label>

      {withLogin && (
        <Field
          label="Temporary password"
          name="password"
          type="text"
          required
          minLength={8}
          autoComplete="off"
          hint="The patient logs in with the email above and this password. Give it to them privately; they can reset it with Forgot Password."
        />
      )}
    </ModalForm>
  );
}

function CreateLoginModal({ patient, onClose }: { patient: PatientRow; onClose: () => void }) {
  const { state, pending, submit } = useFormSubmit(createLoginForPatient);

  return (
    <ModalForm
      title={`Create login for ${patient.name}`}
      submitLabel="Create Login"
      onClose={onClose}
      onSubmit={(e) => submit(e, onClose)}
      error={state?.error}
      pending={pending}
    >
      <input type="hidden" name="id" value={patient.id} />
      <DetailRow label="Email (the login)" value={patient.email} />
      <Field
        label="Temporary password"
        name="password"
        type="text"
        required
        minLength={8}
        autoComplete="off"
        hint="At least 8 characters. Give it to the patient privately; they can reset it with Forgot Password."
      />
    </ModalForm>
  );
}

function ResetPatientPasswordModal({ patient, onClose }: { patient: PatientRow; onClose: () => void }) {
  const { state, pending, submit } = useFormSubmit(resetPatientPassword);

  return (
    <ModalForm
      title={`Reset password for ${patient.name}`}
      submitLabel="Reset Password"
      onClose={onClose}
      onSubmit={(e) =>
        submit(e, () => {
          window.alert(`Password reset for ${patient.name}. Give the new password to the patient privately.`);
          onClose();
        })
      }
      error={state?.error}
      pending={pending}
    >
      <input type="hidden" name="id" value={patient.id} />
      <DetailRow label="Login (email)" value={patient.email} />
      <Field
        label="New temporary password"
        name="password"
        type="text"
        required
        minLength={8}
        autoComplete="off"
        hint="At least 8 characters. Give it to the patient privately."
      />
    </ModalForm>
  );
}

function EditPatientModal({ patient, today, onClose }: { patient: PatientRow; today: string; onClose: () => void }) {
  const { state, pending, submit } = useFormSubmit(updatePatient);

  return (
    <ModalForm
      title={`Edit Patient ${patient.code}`}
      submitLabel="Save Changes"
      onClose={onClose}
      onSubmit={(e) => submit(e, onClose)}
      error={state?.error}
      pending={pending}
    >
      <input type="hidden" name="id" value={patient.id} />
      <PatientFields patient={patient} today={today} />
    </ModalForm>
  );
}

export function PatientsView({ rows, total, page, pageSize, q, status, today, canArchive, canResetPassword }: PatientsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [modal, setModal] = useState<ModalState>(null);
  const [isPending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLSelectElement>(null);

  // Search and filter live in the URL, so the database does the filtering (and the page can be bookmarked).
  function applyFilters() {
    const params = new URLSearchParams();
    const text = searchRef.current?.value.trim() ?? "";
    const chosen = statusRef.current?.value ?? "All Status";

    if (text) params.set("q", text);
    if (chosen !== "All Status") params.set("status", chosen);

    const qs = params.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname));
  }

  function onSearchInput() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(applyFilters, 300);
  }

  function toggleArchive(patient: PatientRow) {
    const archiving = patient.status === "Active";

    const message = archiving
      ? `Archive ${patient.name}?\n\nThe record is kept but marked Inactive, and their login (if any) is switched off.`
      : `Restore ${patient.name}? Their login (if any) will work again.`;

    if (!window.confirm(message)) return;

    startTransition(async () => {
      const result = await setPatientArchived(patient.id, archiving);
      if (result.error) window.alert(result.error);
    });
  }

  const close = () => setModal(null);

  const filterParams: Record<string, string> = {};
  if (q) filterParams.q = q;
  if (status === "Active" || status === "Inactive") filterParams.status = status;

  return (
    <section className="page active-page">
      <div className="page-heading">
        <div>
          <h1>Patient Management</h1>
          <p>Manage registered patients.</p>
        </div>

        <button type="button" className="primary-btn" onClick={() => setModal({ mode: "add" })}>
          + Add Patient
        </button>
      </div>

      <div className="panel">
        <div className="toolbar">
          <input
            ref={searchRef}
            type="text"
            placeholder="Search patients..."
            defaultValue={q}
            onInput={onSearchInput}
            aria-label="Search patients"
          />

          <select ref={statusRef} defaultValue={status === "Active" || status === "Inactive" ? status : "All Status"} onChange={applyFilters} aria-label="Filter by status">
            <option>All Status</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </div>

        <div className="table-wrapper" style={{ opacity: isPending ? 0.6 : 1 }}>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Patient Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Age</th>
                <th>BP (mmHg)</th>
                <th>Hip (cm)</th>
                <th>Waist (cm)</th>
                <th>PhilHealth No.</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={11}>No patients found.</td>
                </tr>
              ) : (
                rows.map((p) => (
                  <tr key={p.id}>
                    <td>{p.code}</td>
                    <td>
                      <strong>{p.name}</strong>
                    </td>
                    <td>{p.email || "-"}</td>
                    <td>{p.phone || "-"}</td>
                    <td>{ageFromBirthDate(p.birthDate, today) ?? "-"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{p.bloodPressure || "-"}</td>
                    <td>{p.hipCm || "-"}</td>
                    <td>{p.waistCm || "-"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{p.philhealth ? formatPhilhealth(p.philhealth) : "-"}</td>
                    <td>
                      <StatusBadge kind={p.status === "Active" ? "active" : "inactive"}>{p.status}</StatusBadge>
                    </td>
                    <td>
                      <button type="button" className="action-btn" onClick={() => setModal({ mode: "view", patient: p })}>
                        View
                      </button>{" "}
                      <button type="button" className="action-btn" onClick={() => setModal({ mode: "edit", patient: p })}>
                        Edit
                      </button>
                      {!p.hasLogin && p.email && p.status === "Active" && (
                        <>
                          {" "}
                          <button type="button" className="action-btn" onClick={() => setModal({ mode: "login", patient: p })}>
                            Create login
                          </button>
                        </>
                      )}
                      {canArchive && (
                        <>
                          {" "}
                          <button type="button" className="action-btn" onClick={() => toggleArchive(p)}>
                            {p.status === "Active" ? "Archive" : "Restore"}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination basePath="/admin/patients" page={page} pageSize={pageSize} total={total} params={filterParams} />
      </div>

      {modal?.mode === "add" && <AddPatientModal today={today} onClose={close} />}
      {modal?.mode === "edit" && <EditPatientModal patient={modal.patient} today={today} onClose={close} />}
      {modal?.mode === "login" && <CreateLoginModal patient={modal.patient} onClose={close} />}
      {modal?.mode === "reset" && <ResetPatientPasswordModal patient={modal.patient} onClose={close} />}
      {modal?.mode === "view" && (
        <ModalForm title={`Patient ${modal.patient.code}`} onClose={close}>
          <DetailRow label="Name" value={modal.patient.name} />
          <DetailRow label="Date of birth" value={modal.patient.birthDate || "-"} />
          <DetailRow
            label="Age"
            value={ageLabel(ageFromBirthDate(modal.patient.birthDate, today)) || "-"}
          />
          <DetailRow label="Contact number" value={modal.patient.phone || "-"} />
          <DetailRow label="Email" value={modal.patient.email || "-"} />
          <DetailRow label="Blood pressure" value={modal.patient.bloodPressure ? `${modal.patient.bloodPressure} mmHg` : "-"} />
          <DetailRow label="Hip measurement" value={modal.patient.hipCm ? `${modal.patient.hipCm} cm` : "-"} />
          <DetailRow label="Waist measurement" value={modal.patient.waistCm ? `${modal.patient.waistCm} cm` : "-"} />
          <DetailRow label="PhilHealth number" value={modal.patient.philhealth ? formatPhilhealth(modal.patient.philhealth) : "-"} />
          <DetailRow label="Status" value={modal.patient.status} />
          <DetailRow label="Patient login" value={modal.patient.hasLogin ? "Yes" : "No"} />
          {canResetPassword && modal.patient.hasLogin && (
            <p style={{ margin: "10px 0 4px" }}>
              <button type="button" className="action-btn" onClick={() => setModal({ mode: "reset", patient: modal.patient })}>
                Reset password
              </button>
            </p>
          )}
          <DetailRow label="Added" value={modal.patient.addedBy} />
          <DetailRow label="Registered" value={modal.patient.registered} />
        </ModalForm>
      )}
    </section>
  );
}
