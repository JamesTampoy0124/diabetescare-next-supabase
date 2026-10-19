"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { login } from "@/actions/auth";
import { useFormSubmit } from "@/components/ui/useFormSubmit";
import { clearActivity } from "@/lib/session";
import { FormMessage } from "./FormMessage";
import { PasswordField } from "./PasswordField";

const REMEMBER_KEY = "diabetescare.rememberedEmail";

export function LoginForm({ notice }: { notice?: string }) {
  const { state, pending, submit } = useFormSubmit(login);
  const emailRef = useRef<HTMLInputElement>(null);
  const rememberRef = useRef<HTMLInputElement>(null);

  // "Remember me" remembers the email address on this device (the session itself is handled by Supabase).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved && emailRef.current && rememberRef.current) {
        emailRef.current.value = saved;
        rememberRef.current.checked = true;
      }
    } catch {
      /* storage not available */
    }
  }, []);

  return (
    <div className="form-container">
      <h2>Welcome Back</h2>
      <p className="subtitle">Log in to your DiabetesCare account</p>

      <FormMessage kind="info">{notice}</FormMessage>
      <FormMessage kind="error">{state?.error}</FormMessage>

      <form
        onSubmit={(event) => {
          try {
            if (rememberRef.current?.checked && emailRef.current) {
              localStorage.setItem(REMEMBER_KEY, emailRef.current.value.trim().toLowerCase());
            } else {
              localStorage.removeItem(REMEMBER_KEY);
            }
          } catch {
            /* storage not available */
          }
          clearActivity(); // a fresh login always starts a fresh 5-minute idle timer
          submit(event);
        }}
      >
        <div className="input-group">
          <label htmlFor="loginEmail">Email Address</label>
          <input
            ref={emailRef}
            type="email"
            id="loginEmail"
            name="email"
            placeholder="Enter your email"
            autoComplete="email"
            required
          />
        </div>

        <PasswordField
          id="loginPassword"
          name="password"
          label="Password"
          placeholder="Enter your password"
          autoComplete="current-password"
        />

        <div className="form-options">
          <label className="remember">
            <input ref={rememberRef} type="checkbox" />
            Remember me
          </label>

          <Link href="/forgot-password">Forgot Password?</Link>
        </div>

        <button type="submit" className="primary-btn" disabled={pending}>
          {pending ? "Logging in..." : "Log In"}
        </button>
      </form>

      <div className="divider">
        <span>or</span>
      </div>

      <p className="switch-form">
        Don&apos;t have an account? <Link href="/register">Create Account</Link>
      </p>
    </div>
  );
}
