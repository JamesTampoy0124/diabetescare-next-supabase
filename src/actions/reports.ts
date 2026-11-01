"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveProfile } from "@/lib/auth";
import { PANEL_ROLES } from "@/lib/roles";
import { todayInClinicTz } from "@/lib/utils/format";
import type { ActionState } from "@/types/actions";
import type { Report, ReportType } from "@/types/database";

export interface ReportActionState extends ActionState {
  report?: Report;
}

const TYPES: ReportType[] = ["patient", "glucose", "appointment"];

/** Calculates the report inside the database (public.generate_report) and stores it. */
export async function generateReport(type: string): Promise<ReportActionState> {
  if (!(await getActiveProfile(PANEL_ROLES))) return { error: "You do not have permission to do this." };
  if (!TYPES.includes(type as ReportType)) return { error: "Choose a report type." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("generate_report", { p_type: type, p_today: todayInClinicTz() });

  if (error || !data) return { error: "The report could not be generated. Please try again." };

  revalidatePath("/admin", "layout");

  const row = data as { id: string; type: ReportType; summary: Report["summary"]; generated_at: string };
  return {
    success: "Report generated successfully!",
    report: { id: row.id, type: row.type, summary: row.summary, generated_at: row.generated_at },
  };
}
