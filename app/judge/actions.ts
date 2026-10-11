"use server";

import { requireRole, getCurrentJudge } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * 1. SAVE DRAFT EVALUATION
 */
export async function saveEvaluationDraft(
  teamId: string,
  scores: Array<{ criterion_id: string; score: number }>
) {
  const profile = await requireRole(["judge"]);
  const judge = await getCurrentJudge();
  const supabase = await createClient();

  // Verify event stage
  const { data: event } = await supabase.from("events").select("stage").limit(1).single();
  const stage = event?.stage;
  if (stage !== "PRESENTATIONS" && stage !== "INVESTMENT_OPEN") {
    throw new Error(`Evaluation modification is locked outside active judging rounds (current stage: ${stage})`);
  }

  // 1. Upsert evaluation record (draft status)
  const { data: evaluation, error: evalErr } = await supabase
    .from("evaluations")
    .upsert(
      {
        judge_id: judge.id,
        team_id: teamId,
        status: "draft",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "judge_id,team_id" }
    )
    .select("id")
    .single();

  if (evalErr || !evaluation) {
    throw new Error(evalErr?.message || "Failed to create or update evaluation draft");
  }

  // 2. Upsert scores
  for (const s of scores) {
    if (s.score !== null && s.score !== undefined && !isNaN(s.score)) {
      const { error: scoreErr } = await supabase
        .from("evaluation_scores")
        .upsert(
          {
            evaluation_id: evaluation.id,
            criterion_id: s.criterion_id,
            score: Number(s.score),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "evaluation_id,criterion_id" }
        );

      if (scoreErr) throw new Error(scoreErr.message);
    }
  }

  revalidatePath("/judge");
  revalidatePath(`/judge/evaluate/${teamId}`);
  return { success: true, evaluationId: evaluation.id };
}

/**
 * 2. SUBMIT FINAL EVALUATION
 */
export async function submitEvaluationFinal(
  teamId: string,
  scores: Array<{ criterion_id: string; score: number }>
) {
  // First save draft to ensure DB has latest values
  const draftRes = await saveEvaluationDraft(teamId, scores);

  const supabase = await createClient();

  // Call PostgreSQL submit_evaluation function which performs validation and creates history record
  const { data, error } = await supabase.rpc("submit_evaluation", {
    p_evaluation_id: draftRes.evaluationId,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/judge");
  revalidatePath("/judge/history");
  revalidatePath(`/judge/evaluate/${teamId}`);
  return data;
}
