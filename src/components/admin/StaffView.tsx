"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createStaff, resetStaffPassword, setStaffActive } from "@/actions/staff";
import { Field, SelectField } from "@/components/ui/Fields";
import { ModalForm } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useFormSubmit } from "@/components/ui/useFormSubmit";
import { ROLES, STAFF_ROLES } from "@/lib/roles";

export interface StaffRow {
  id: string;
  name: string;
  email: string;
  initials: string;
  detail: string;
  active: boolean;
}

function AddStaffModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { state, pending, submit } = useFormSubmit(createStaff);

  return (
    <ModalForm
      title="Add Staff Account"
      submitLabel="Create Account"
      onClose={onClose}
      onSubmit={(e) =>
        submit(e, () => {
          router.refresh(); // show the new staff member in the list straight away
          onClose();
        })
      }
      error={state?.error}
      pending={pending}
    >
      <Field label="Full name" name="name" type="text" required maxLength={80} />
      <Field label="Email (used to log in)" name="email" type="email" required />
      <SelectField
        label="Role"
        name="role"
        defaultValue="doctor"
        options={STAFF_ROLES.map((r) => ({ value: r, label: ROLES[r] }))}
      />
      <Field
        label="Specialty or title (optional)"
        name="specialty"
        type="text"
        maxLength={60}
        placeholder="e.g. Endocrinologist"
      />
      <Field
        label="Temporary password"
        name="password"
        type="text"
        required
        minLength={8}
        autoComplete="off"
        hint="At least 8 characters. Give it to the staff member privately."
      />
    </ModalForm>
  );
}

function ResetPasswordModal({ staff, onClose }: { staff: StaffRow; onClose: () => void }) {
  const { state, pending, submit } = useFormSubmit(resetStaffPassword);

  return (
    <ModalForm
      title={`Reset Password for ${staff.name}`}
      submitLabel="Reset Password"
      onClose={onClose}
      onSubmit={(e) =>
        submit(e, () => {
          window.alert(`Password reset for ${staff.name}.`);
          onClose();
        })
      }
      error={state?.error}
      pending={pending}
    >
      <input type="hidden" name="id" value={staff.id} />
      <Field
        label="New temporary password"
        name="password"
        type="text"
        required
        minLength={8}
        autoComplete="off"
        hint="At least 8 characters. Give it to the staff member privately."
      />
    </ModalForm>
  );
}

type ModalState = null | { mode: "add" } | { mode: "reset"; staff: StaffRow };

export function StaffView({ staff }: { staff: StaffRow[] }) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalState>(null);
  const [, startTransition] = useTransition();

  function toggle(member: StaffRow) {
    const deactivating = member.active;

    const message = deactivating
      ? `Deactivate ${member.name}? They will no longer be able to log in.`
      : `Activate ${member.name}?`;

    if (!window.confirm(message)) return;

    startTransition(async () => {
      const result = await setStaffActive(member.id, !deactivating);
      if (result.error) window.alert(result.error);
      else router.refresh();
    });
  }

  const close = () => setModal(null);

  return (
    <section className="page active-page">
      <div className="page-heading">
        <div>
          <h1>Staff Management</h1>
          <p>Create and manage logins for doctors, nurses, front desk and administrators.</p>
        </div>

        <button type="button" className="primary-btn" onClick={() => setModal({ mode: "add" })}>
          + Add Staff
        </button>
      </div>


      <div className="cards-grid">
        {staff.length === 0 && <p>No staff accounts yet.</p>}

        {staff.map((u) => (
          <div className="doctor-card" key={u.id}>
            <div className="doctor-avatar">{u.initials}</div>
            <h3>{u.name}</h3>
            <p>
              {u.detail}
              <br />
              <small>{u.email}</small>
            </p>
            <StatusBadge kind={u.active ? "active" : "inactive"}>{u.active ? "Active" : "Deactivated"}</StatusBadge>

            <div style={{ marginTop: 14 }}>
              <button type="button" className="action-btn" onClick={() => toggle(u)}>
                {u.active ? "Deactivate" : "Activate"}
              </button>{" "}
              <button type="button" className="action-btn" onClick={() => setModal({ mode: "reset", staff: u })}>
                Reset Password
              </button>
            </div>
          </div>
        ))}
      </div>

      {modal?.mode === "add" && <AddStaffModal onClose={close} />}
      {modal?.mode === "reset" && <ResetPasswordModal staff={modal.staff} onClose={close} />}
    </section>
  );
}
