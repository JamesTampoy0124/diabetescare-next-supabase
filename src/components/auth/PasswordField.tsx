"use client";

import { useState } from "react";

interface PasswordFieldProps {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  autoComplete?: string;
}

/** Password input with the original Show / Hide button. */
export function PasswordField({ id, name, label, placeholder, autoComplete }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="input-group">
      <label htmlFor={id}>{label}</label>

      <div className="password-box">
        <input
          type={visible ? "text" : "password"}
          id={id}
          name={name}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
        />

        <button type="button" className="show-password" onClick={() => setVisible((v) => !v)}>
          {visible ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}
