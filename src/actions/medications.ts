"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAdminOrNull } from "@/lib/auth";
import { firstError, str } from "@/lib/utils/form";
import { medicationSchema } from "@/lib/validations/records";
import type { ActionState } from "@/types/actions";

export async function createMedication(formData: FormData): Promise<ActionState> {
  if (!(await getAdminOrNull())) return { error: "You do not have permission to do this." };

  const parsed = medicationSchema.safeParse({
    name: str(formData, "name"),
    description: str(formData, "description"),
    dosage: str(formData, "dosage"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("medications").insert({ ...parsed.data, status: "Active" });

  if (error) {
    return error.code === "23505"
      ? { error: "That medication is already in the list." }
      : { error: "Something went wrong while saving. Please try again." };
  }

  revalidatePath("/admin", "layout");
  return { success: "Medication added." };
}
