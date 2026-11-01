"use client";

import { useState, useTransition, type FormEvent } from "react";
import type { ActionState } from "@/types/actions";

/**
 * Runs a Server Action from a <form> without React resetting the fields afterwards,
 * so people don't lose what they typed when a validation error comes back.
 * If the action answers with `redirectTo` (login, password reset), the browser opens that page.
 */
export function useFormSubmit<T extends ActionState>(action: (formData: FormData) => Promise<T>) {
  const [state, setState] = useState<T | null>(null);
  const [navigating, setNavigating] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>, onSuccess?: (result: T) => void) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const result = await action(formData);
        setState(result);

        if (result && !result.error) {
          onSuccess?.(result);

          if (result.redirectTo) {
            setNavigating(true); // keep the button disabled until the next page opens
            // A full page load, like pressing reload: the new login cookie is always used and nothing stale is shown.
            window.location.assign(result.redirectTo);
          }
        }
      } catch (error) {
        // A redirect is not a failure
        const digest = (error as { digest?: unknown } | null)?.digest;
        if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) return;

        setState({ error: "Something went wrong. Please try again." } as T);
      }
    });
  }

  return { state, pending: pending || navigating, submit, reset: () => setState(null) };
}