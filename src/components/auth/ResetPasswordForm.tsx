"use client";

import { resetPassword } from "@/actions/auth";
import { useFormSubmit } from "@/components/ui/useFormSubmit";
import { FormMessage } from "./FormMessage";
import { PasswordField } from "./PasswordField";

export function ResetPasswordForm() {
  const { state, pending, submit } = useFormSubmit(resetPassword);

  return (
    <div className="form-container">
      <h2>Choose a New Password</h2>
      <p className="subtitle">Enter a new password for your DiabetesCare account.</p>

      <FormMessage kind="error">{state?.error}</FormMessage>

      <form onSubmit={submit}>
        <PasswordField
          id="newPassword"
          name="password"
          label="New Password"
          placeholder="Create a password"
          autoComplete="new-password"
        />

        <PasswordField
          id="confirmNewPassword"
          name="confirmPassword"
          label="Confirm Password"
          placeholder="Confirm your password"
          autoComplete="new-password"
        />

        <button type="submit" className="primary-btn" disabled={pending}>
          {pending ? "Saving..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}
