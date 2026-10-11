import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { EvaluationsMatrix } from "@/components/admin/evaluations-matrix";

export const dynamic = "force-dynamic";

export default async function AdminEvaluationsPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();

  const { data: judges } = await supabase.from("judges").select("id, display_name").order("display_name");
  const { data: teams } = await supabase.from("teams").select("id, team_no, name").eq("is_active", true).order("team_no");

  const { data: evaluations } = await supabase.from("evaluations").select("id, judge_id, team_id, status");
  const { data: waivers } = await supabase.from("evaluation_waivers").select("judge_id, team_id, reason");

  const matrix: Record<string, any> = {};

  for (const w of waivers || []) {
    matrix[`${w.judge_id}_${w.team_id}`] = {
      judge_id: w.judge_id,
      team_id: w.team_id,
      status: "waived",
      waiver_reason: w.reason,
    };
  }

  for (const ev of evaluations || []) {
    matrix[`${ev.judge_id}_${ev.team_id}`] = {
      judge_id: ev.judge_id,
      team_id: ev.team_id,
      evaluation_id: ev.id,
      status: ev.status,
    };
  }

  return (
    <EvaluationsMatrix
      judges={judges || []}
      teams={teams || []}
      matrix={matrix}
    />
  );
}
