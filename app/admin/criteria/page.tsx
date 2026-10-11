import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { CriteriaManager } from "@/components/admin/criteria-manager";

export const dynamic = "force-dynamic";

export default async function AdminCriteriaPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();

  const { data: criteria } = await supabase
    .from("criteria")
    .select("*")
    .order("sort_order", { ascending: true });

  // Check if any evaluation is already submitted
  const { count: submittedCount } = await supabase
    .from("evaluations")
    .select("*", { count: "exact", head: true })
    .eq("status", "submitted");

  const isLocked = (submittedCount ?? 0) > 0;

  return (
    <CriteriaManager
      initialCriteria={criteria || []}
      isLocked={isLocked}
    />
  );
}
