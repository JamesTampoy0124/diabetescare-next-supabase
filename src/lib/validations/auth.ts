import { z } from "zod";
import { birthDateField, emailField, passwordField, phoneField } from "./common";

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Enter your password."),
});

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Please enter your full name.").max(80, "Name is too long."),
    birthDate: birthDateField,
    phone: phoneField,
    email: emailField,
    password: passwordField,
    confirmPassword: z.string(),
    terms: z.literal("on", { errorMap: () => ({ message: "Please accept the Terms and Privacy Policy." }) }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({ email: emailField });

export const resetPasswordSchema = z
  .object({ password: passwordField, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({ current: z.string().min(1, "Enter your current password."), next: passwordField, confirm: z.string() })
  .refine((d) => d.next === d.confirm, { message: "The new passwords do not match.", path: ["confirm"] });
