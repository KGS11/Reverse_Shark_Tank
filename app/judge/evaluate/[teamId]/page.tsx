import { requireRole, getCurrentJudge } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { EvaluationForm } from "@/components/judge/evaluation-form";

export const dynamic = "force-dynamic";

export default async function JudgeEvaluateTeamPage({
  params,
}: {
  params: { teamId: string };
}) {
  await requireRole(["judge"]);
  const judge = await getCurrentJudge();
  const supabase = await createClient();

  const { teamId } = params;

  // 1. Check if judge is excluded from this team
  const { data: exclusion } = await supabase
    .from("judge_team_exclusions")
    .select("reason")
    .eq("judge_id", judge.id)
    .eq("team_id", teamId)
    .single();

  if (exclusion) {
    redirect("/judge?error=excluded");
  }

  // 2. Fetch Team
  const { data: team } = await supabase
    .from("teams")
    .select("id, team_no, name, failed_company, pitch_summary")
    .eq("id", teamId)
    .single();

  if (!team) {
    notFound();
  }

  // 3. Fetch Event
  const { data: event } = await supabase.from("events").select("stage").limit(1).single();
  const eventStage = event?.stage || "SETUP";
  const isJudgingOpen = eventStage === "PRESENTATIONS" || eventStage === "INVESTMENT_OPEN";

  // 4. Fetch Active Criteria
  const { data: criteria } = await supabase
    .from("criteria")
    .select("id, name, description, max_score, weight")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  // 5. Fetch Existing Evaluation
  const { data: evaluation } = await supabase
    .from("evaluations")
    .select("id, status, submitted_at")
    .eq("judge_id", judge.id)
    .eq("team_id", teamId)
    .single();

  const initialScores: Record<string, number> = {};

  if (evaluation) {
    const { data: scores } = await supabase
      .from("evaluation_scores")
      .select("criterion_id, score")
      .eq("evaluation_id", evaluation.id);

    for (const s of scores || []) {
      initialScores[s.criterion_id] = Number(s.score);
    }
  }

  // Check if reopened
  let reopenReason: string | null = null;
  if (evaluation && evaluation.status === "draft") {
    const { data: lastAction } = await supabase
      .from("evaluation_history")
      .select("reason")
      .eq("evaluation_id", evaluation.id)
      .eq("action", "reopened")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (lastAction) {
      reopenReason = lastAction.reason;
    }
  }

  return (
    <EvaluationForm
      team={team}
      criteria={(criteria as any) || []}
      initialScores={initialScores}
      status={(evaluation?.status || "none") as any}
      isJudgingOpen={isJudgingOpen}
      eventStage={eventStage}
      reopenReason={reopenReason}
    />
  );
}
