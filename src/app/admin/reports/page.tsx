import { ReportsView, type ReportItem } from "@/components/admin/ReportsView";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils/format";
import type { Report } from "@/types/database";

export default async function ReportsPage() {
  await requireProfile(["admin"]);

  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("id, type, summary, generated_at")
    .order("generated_at", { ascending: false })
    .limit(10);

  const recent: ReportItem[] = ((data ?? []) as Report[]).map((r) => ({
    ...r,
    generatedLabel: formatDateTime(r.generated_at),
  }));

  return <ReportsView recent={recent} />;
}
