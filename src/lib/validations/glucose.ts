import { z } from "zod";
import { GLUCOSE_CONTEXTS } from "@/lib/glucose";
import { uuidField } from "./common";

export const addGlucoseSchema = z.object({
  patientId: uuidField,
  value: z.string().trim().min(1, "Enter the reading as a number."),
  unit: z.enum(["mg/dL", "mmol/L"]),
  context: z.enum(GLUCOSE_CONTEXTS.map((c) => c.value) as [string, ...string[]], {
    errorMap: () => ({ message: "Choose when the reading was taken." }),
  }),
  takenAt: z.string().min(1, "Enter the date and time of the reading."),
  note: z.string().trim().max(200, "The note is too long (200 characters maximum)."),
});

export const voidGlucoseSchema = z.object({
  id: uuidField,
  reason: z.string().trim().min(3, "Please give a short reason.").max(200, "The reason is too long."),
});
