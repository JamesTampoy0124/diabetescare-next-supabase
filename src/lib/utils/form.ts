import type { ZodError } from "zod";

/** Read a text field from FormData ("" when missing or a file). */
export function str(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/** First validation message, shown to the user. */
export function firstError(error: ZodError): string {
  return error.issues[0]?.message ?? "Please check the form and try again.";
}

/** Escape % and _ so a typed name is matched literally by ilike. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => "\\" + c);
}
