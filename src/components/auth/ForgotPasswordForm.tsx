"use client";

import Link from "next/link";
import { forgotPassword } from "@/actions/auth";
import { useFormSubmit } from "@/components/ui/useFormSubmit";
import { FormMessage } from "./FormMessage";

export function ForgotPasswordForm() {
  const { state, pending, submit } = useFormSubmit(forgotPassword);

  return (
    <div className="form-container">
      <h2>Forgot Password?</h2>
      <p className="subtitle">Enter your registered email address and we&apos;ll send you a reset link.</p>

      <FormMessage kind="error">{state?.error}</FormMessage>
      <FormMessage kind="success">{state?.success}</FormMessage>

      <form onSubmit={submit}>
        <div className="input-group">
          <label htmlFor="resetEmail">Email Address</label>
          <input
            type="email"
            id="resetEmail"
            name="email"
            placeholder="Enter your email"
            autoComplete="email"
            required
          />
        </div>

        <button type="submit" className="primary-btn" disabled={pending}>
          {pending ? "Sending..." : "Send Reset Link"}
        </button>
      </form>

      <p className="switch-form" style={{ marginTop: 20 }}>
        <Link href="/login">Back to Log In</Link>
      </p>
    </div>
  );
}
