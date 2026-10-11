import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { ResultsManager } from "@/components/admin/results-manager";
import { STAGES, EventStage } from "@/lib/validation";

export const dynamic = "force-dynamic";

export default async function AdminResultsPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();

  // 1. Fetch Event
  const { data: event } = await supabase.from("events").select("*").limit(1).single();

  // 2. Fetch Active Teams Count
  const { count: teamsCount } = await supabase
    .from("teams")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  // 3. Fetch Judges Count
  const { count: judgesCount } = await supabase.from("judges").select("*", { count: "exact", head: true });

  // 4. Fetch Pending Evaluations Count
  // Count unsubmitted evaluations not waived
  const { data: judges } = await supabase.from("judges").select("id");
  const { data: activeTeams } = await supabase.from("teams").select("id").eq("is_active", true);
  const { data: submittedEvals } = await supabase.from("evaluations").select("judge_id, team_id").eq("status", "submitted");
  const { data: waivers } = await supabase.from("evaluation_waivers").select("judge_id, team_id");
  const { data: exclusions } = await supabase.from("judge_team_exclusions").select("judge_id, team_id");

  const resolvedSet = new Set<string>();
  for (const ev of submittedEvals || []) resolvedSet.add(`${ev.judge_id}_${ev.team_id}`);
  for (const w of waivers || []) resolvedSet.add(`${w.judge_id}_${w.team_id}`);
  for (const ex of exclusions || []) resolvedSet.add(`${ex.judge_id}_${ex.team_id}`);

  let pendingCount = 0;
  for (const j of judges || []) {
    for (const t of activeTeams || []) {
      if (!resolvedSet.has(`${j.id}_${t.id}`)) {
        pendingCount++;
      }
    }
  }

  // 5. Verification Checklist items
  const currentStage = event?.stage || "SETUP";
  const stageIdx = STAGES.indexOf(currentStage as EventStage);
  const investmentsLocked = stageIdx >= STAGES.indexOf("INVESTMENT_CLOSED");
  const allEvaluationsResolved = pendingCount === 0;
  const weightsSum = Number(event?.weight_judge || 0) + Number(event?.weight_invest || 0);
  const weightsValid = Math.abs(weightsSum - 100) < 0.001;
  const hasMinTeams = (teamsCount ?? 0) >= 2;

  const readyToPublish =
    investmentsLocked &&
    allEvaluationsResolved &&
    weightsValid &&
    hasMinTeams &&
    currentStage !== "PUBLISHED";

  // 6. Fetch Latest Snapshot
  const { data: latestSnapshot } = await supabase
    .from("results_snapshots")
    .select("id, status, weight_judge, weight_invest, highest_investment_points, created_at, published_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  let snapshotData = null;
  if (latestSnapshot) {
    const { data: rows } = await supabase
      .from("result_rows")
      .select(`
        rank,
        team_id,
        avg_judge_score,
        points_received,
        investment_score,
        final_score,
        team:teams (
          team_no,
          name,
          failed_company
        )
      `)
      .eq("snapshot_id", latestSnapshot.id)
      .order("rank", { ascending: true })
      .order("final_score", { ascending: false });

    snapshotData = {
      id: latestSnapshot.id,
      status: latestSnapshot.status as "preview" | "published",
      weight_judge: Number(latestSnapshot.weight_judge),
      weight_invest: Number(latestSnapshot.weight_invest),
      highest_investment_points: latestSnapshot.highest_investment_points,
      created_at: latestSnapshot.created_at,
      published_at: latestSnapshot.published_at,
      rows: (rows as any) || [],
    };
  }

  return (
    <ResultsManager
      stage={currentStage}
      checklist={{
        investmentsLocked,
        allEvaluationsResolved,
        pendingEvaluationsCount: pendingCount,
        weightsValid,
        weightsSum,
        teamsCount: teamsCount || 0,
        readyToPublish,
      }}
      currentSnapshot={snapshotData}
    />
  );
}
