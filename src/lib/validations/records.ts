import { z } from "zod";
import { STAFF_ROLES } from "@/lib/roles";
import { birthDateField, dateField, emailField, passwordField, phoneField, uuidField } from "./common";

const bloodPressureField = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{2,3}\/\d{2,3}$/.test(v), "Blood pressure must look like 120/80.")
  .refine((v) => {
    if (v === "") return true;
    const [systolic, diastolic] = v.split("/").map(Number);
    return systolic >= 50 && systolic <= 300 && diastolic >= 30 && diastolic <= 200 && systolic > diastolic;
  }, "Please check the blood pressure values (for example 120/80).");

const measurementField = (label: string) =>
  z
    .string()
    .trim()
    .refine(
      (v) => v === "" || (/^\d{1,3}(\.\d)?$/.test(v) && Number(v) >= 20 && Number(v) <= 300),
      `${label} must be a number in cm, for example 92.5.`
    );

// Spaces and dashes are allowed when typing; 12 digits are stored.
const philhealthField = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .refine((v) => v === "" || /^\d{12}$/.test(v), "The PhilHealth number must have 12 digits (for example 01-234567890-1).");

export const patientSchema = z.object({
  name: z.string().trim().min(2, "Please enter the patient's full name.").max(80, "Name is too long."),
  birthDate: birthDateField,
  phone: phoneField,
  // optional: empty string allowed
  email: z.union([z.literal(""), emailField]),
  bloodPressure: bloodPressureField,
  hipCm: measurementField("Hip measurement"),
  waistCm: measurementField("Waist measurement"),
  philhealth: philhealthField,
});

export const staffSchema = z.object({
  name: z.string().trim().min(2, "Please enter the staff member's full name.").max(80, "Name is too long."),
  email: emailField,
  role: z.enum(STAFF_ROLES as [string, ...string[]], { errorMap: () => ({ message: "Choose a role." }) }),
  specialty: z.string().trim().max(60, "Specialty is too long."),
  password: passwordField,
});

export const appointmentSchema = z.object({
  patientId: uuidField,
  doctorId: uuidField,
  date: dateField,
  time: z.string().regex(/^\d{2}:\d{2}$/, "Choose a time."),
  notes: z.string().trim().max(500, "Notes are too long (500 characters maximum)."),
});

export const appointmentStatusSchema = z.object({
  id: uuidField,
  status: z.enum(["pending", "confirmed", "completed", "cancelled"], {
    errorMap: () => ({ message: "Choose a status." }),
  }),
});

export const medicationSchema = z.object({
  name: z.string().trim().min(1, "Enter the medication name.").max(80, "Name is too long."),
  description: z.string().trim().max(120, "Description is too long."),
  dosage: z.string().trim().max(40, "Dosage is too long."),
});
