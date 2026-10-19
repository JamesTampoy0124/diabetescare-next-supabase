import { z } from "zod";

export const emailField = z.string().trim().toLowerCase().email("Enter a valid email address.");

export const passwordField = z
  .string()
  .min(8, "Password must contain at least 8 characters.")
  .max(72, "Password is too long (72 characters maximum).");

export const phoneField = z
  .string()
  .trim()
  .regex(/^[0-9+\-\s()]{7,20}$/, "Enter a valid contact number.");

export const dateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.")
  .refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date.");

export const birthDateField = dateField.refine((v) => v >= "1900-01-01", "Enter a valid date of birth.");

export const uuidField = z.string().uuid("Invalid record.");
