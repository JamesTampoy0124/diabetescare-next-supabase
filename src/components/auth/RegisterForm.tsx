"use client";

import Link from "next/link";
import { useRef } from "react";
import { register } from "@/actions/auth";
import { useFormSubmit } from "@/components/ui/useFormSubmit";
import { FormMessage } from "./FormMessage";
import { PasswordField } from "./PasswordField";

export function RegisterForm({ today }: { today: string }) {
  const { state, pending, submit } = useFormSubmit(register);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="form-container">
      <h2>Create Account</h2>
      <p className="subtitle">Register for your DiabetesCare account</p>

      <FormMessage kind="error">{state?.error}</FormMessage>
      <FormMessage kind="success">{state?.success}</FormMessage>

      <form ref={formRef} onSubmit={(event) => submit(event, () => formRef.current?.reset())}>
        <div className="input-group">
          <label htmlFor="fullName">Full Name</label>
          <input
            type="text"
            id="fullName"
            name="fullName"
            placeholder="Enter your full name"
            autoComplete="name"
            maxLength={80}
            required
          />
        </div>

        <div className="input-row">
          <div className="input-group">
            <label htmlFor="birthDate">Date of Birth</label>
            <input type="date" id="birthDate" name="birthDate" min="1900-01-01" max={today} required />
          </div>

          <div className="input-group">
            <label htmlFor="phone">Contact Number</label>
            <input type="tel" id="phone" name="phone" placeholder="09XXXXXXXXX" autoComplete="tel" required />
          </div>
        </div>

        <div className="input-group">
          <label htmlFor="registerEmail">Email Address</label>
          <input
            type="email"
            id="registerEmail"
            name="email"
            placeholder="Enter your email"
            autoComplete="email"
            required
          />
        </div>

        <PasswordField
          id="registerPassword"
          name="password"
          label="Password"
          placeholder="Create a password"
          autoComplete="new-password"
        />

        <PasswordField
          id="confirmPassword"
          name="confirmPassword"
          label="Confirm Password"
          placeholder="Confirm your password"
          autoComplete="new-password"
        />

        <label className="terms">
          <input type="checkbox" id="terms" name="terms" required />I agree to the Terms and Privacy Policy.
        </label>

        <button type="submit" className="primary-btn" disabled={pending}>
          {pending ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <p className="switch-form" style={{ marginTop: 20 }}>
        Already have an account? <Link href="/login">Log In</Link>
      </p>
    </div>
  );
}
