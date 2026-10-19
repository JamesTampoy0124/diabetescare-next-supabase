"use client";

import { useState, useTransition } from "react";
import { changeOwnPassword, setSystemSetting, updateOwnEmail, updateOwnName } from "@/actions/settings";
import { Field } from "@/components/ui/Fields";
import { ModalForm } from "@/components/ui/Modal";
import { useFormSubmit } from "@/components/ui/useFormSubmit";
import type { ActionState } from "@/types/actions";

interface SettingsViewProps {
  name: string;
  email: string;
  settings: { email_notifications: boolean; automatic_backups: boolean };
}

function SimpleModal({
  title,
  submitLabel,
  action,
  children,
  onClose,
  successMessage,
}: {
  title: string;
  submitLabel: string;
  action: (formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  onClose: () => void;
  successMessage?: boolean;
}) {
  const { state, pending, submit } = useFormSubmit(action);

  return (
    <ModalForm
      title={title}
      submitLabel={submitLabel}
      onClose={onClose}
      onSubmit={(e) =>
        submit(e, (result) => {
          if (successMessage && result.success) window.alert(result.success);
          onClose();
        })
      }
      error={state?.error}
      pending={pending}
    >
      {children}
    </ModalForm>
  );
}

type ModalName = null | "name" | "email" | "password";

export function SettingsView({ name, email, settings }: SettingsViewProps) {
  const [modal, setModal] = useState<ModalName>(null);
  const [values, setValues] = useState(settings);
  const [, startTransition] = useTransition();
  const close = () => setModal(null);

  function toggle(key: keyof typeof values, checked: boolean) {
    const previous = values[key];
    setValues((v) => ({ ...v, [key]: checked }));

    startTransition(async () => {
      const result = await setSystemSetting(key, checked);
      if (result.error) {
        setValues((v) => ({ ...v, [key]: previous }));
        window.alert(result.error);
      }
    });
  }

  return (
    <section className="page active-page">
      <div className="page-heading">
        <div>
          <h1>Settings</h1>
          <p>Manage your administrator settings.</p>
        </div>
      </div>

      <div className="panel settings-panel">
        <h3>Administrator Account</h3>

        <div className="setting-row">
          <div>
            <strong>Administrator Name</strong>
            <p>{name}</p>
          </div>

          <button type="button" className="action-btn" onClick={() => setModal("name")}>
            Edit
          </button>
        </div>

        <div className="setting-row">
          <div>
            <strong>Email Address</strong>
            <p>{email}</p>
          </div>

          <button type="button" className="action-btn" onClick={() => setModal("email")}>
            Edit
          </button>
        </div>

        <div className="setting-row">
          <div>
            <strong>Password</strong>
            <p>••••••••</p>
          </div>

          <button type="button" className="action-btn" onClick={() => setModal("password")}>
            Change
          </button>
        </div>

        <h3 className="settings-title">System Settings</h3>

        <div className="setting-row">
          <div>
            <strong>Email Notifications</strong>
            <p>Receive system notifications by email.</p>
          </div>

          <label className="switch">
            <input
              type="checkbox"
              checked={values.email_notifications}
              onChange={(e) => toggle("email_notifications", e.target.checked)}
            />
            <span></span>
          </label>
        </div>

        <div className="setting-row">
          <div>
            <strong>Automatic Backups</strong>
            <p>Automatically backup system data.</p>
          </div>

          <label className="switch">
            <input
              type="checkbox"
              checked={values.automatic_backups}
              onChange={(e) => toggle("automatic_backups", e.target.checked)}
            />
            <span></span>
          </label>
        </div>
      </div>

      {modal === "name" && (
        <SimpleModal title="Edit Administrator Name" submitLabel="Save Changes" action={updateOwnName} onClose={close}>
          <Field label="Full name" name="name" type="text" defaultValue={name} required maxLength={80} />
        </SimpleModal>
      )}

      {modal === "email" && (
        <SimpleModal
          title="Change Email Address"
          submitLabel="Send Confirmation"
          action={updateOwnEmail}
          onClose={close}
          successMessage
        >
          <Field
            label="New email address"
            name="email"
            type="email"
            defaultValue={email}
            required
            hint="A confirmation link is sent to the new address. Your login email changes after you confirm it."
          />
        </SimpleModal>
      )}

      {modal === "password" && (
        <SimpleModal
          title="Change Your Password"
          submitLabel="Update Password"
          action={changeOwnPassword}
          onClose={close}
          successMessage
        >
          <Field label="Current password" name="current" type="password" required autoComplete="current-password" />
          <Field label="New password" name="next" type="password" required minLength={8} autoComplete="new-password" />
          <Field label="Confirm new password" name="confirm" type="password" required autoComplete="new-password" />
        </SimpleModal>
      )}
    </section>
  );
}
