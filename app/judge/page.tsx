import { requireRole, getCurrentJudge } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { JudgeBoardView } from "@/components/judge/judge-board-view";

export const dynamic = "force-dynamic";

export default async function JudgePage() {
  await requireRole(["judge"]);
  const judge = await getCurrentJudge();
  const supabase = await createClient();

  // 1. Fetch Event Stage
  const { data: event } = await supabase.from("events").select("stage").limit(1).single();

  // 2. Fetch Excluded Teams for this judge
  const { data: exclusions } = await supabase
    .from("judge_team_exclusions")
    .select("team_id")
    .eq("judge_id", judge.id);

  const excludedTeamIds = new Set((exclusions || []).map((e) => e.team_id));

  // 3. Fetch Active Teams
  const { data: teams } = await supabase
    .from("teams")
    .select("id, team_no, name, failed_company, pitch_summary, presentation_order, presentation_status")
    .eq("is_active", true)
    .order("presentation_order", { ascending: true })
    .order("team_no", { ascending: true });

  // 4. Fetch Judge's Own Evaluations
  const { data: evaluations } = await supabase
    .from("evaluations")
    .select("id, team_id, status, submitted_at")
    .eq("judge_id", judge.id);

  // 5. Fetch normalized scores from history if submitted
  const { data: historyScores } = await supabase
    .from("evaluation_history")
    .select("team_id, normalized_score")
    .eq("judge_id", judge.id)
    .eq("action", "submitted")
    .order("created_at", { ascending: false });

  const evalMap = new Map<string, any>();
  for (const ev of evaluations || []) {
    evalMap.set(ev.team_id, ev);
  }

  const scoreMap = new Map<string, number>();
  for (const h of historyScores || []) {
    if (!scoreMap.has(h.team_id) && h.normalized_score !== null) {
      scoreMap.set(h.team_id, Number(h.normalized_score));
    }
  }

  const judgeTeams = (teams || [])
    .filter((t) => !excludedTeamIds.has(t.id))
    .map((t) => {
      const ev = evalMap.get(t.id);
      return {
        id: t.id,
        team_no: t.team_no,
        name: t.name,
        failed_company: t.failed_company,
        pitch_summary: t.pitch_summary,
        presentation_order: t.presentation_order,
        presentation_status: t.presentation_status as any,
        evaluation_status: (ev ? ev.status : "none") as any,
        normalized_score: scoreMap.get(t.id) ?? null,
        submitted_at: ev?.submitted_at || null,
      };
    });

  return (
    <JudgeBoardView
      eventStage={event?.stage || "SETUP"}
      teams={judgeTeams}
    />
  );
}
