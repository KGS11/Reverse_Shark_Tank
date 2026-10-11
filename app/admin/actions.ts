"use server";

import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { STAGES, EventStage, eventSettingsSchema, createTeamSchema, createJudgeSchema } from "@/lib/validation";

/**
 * Helper to generate random readable temporary password
 */
function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const nums = "23456789";
  const specials = "!@#$%";
  let pass = "RST";
  for (let i = 0; i < 4; i++) pass += chars[Math.floor(Math.random() * chars.length)];
  for (let i = 0; i < 3; i++) pass += nums[Math.floor(Math.random() * nums.length)];
  pass += specials[Math.floor(Math.random() * specials.length)];
  return pass;
}

/**
 * 1. ADVANCE / CHANGE EVENT STAGE
 */
export async function setEventStage(targetStage: EventStage, reason?: string) {
  const profile = await requireRole(["admin"]);
  const adminClient = createAdminClient();

  const { data: event, error: eventErr } = await adminClient.from("events").select("*").limit(1).single();
  if (eventErr || !event) throw new Error("Event configuration not found.");

  const currentStage = event.stage as EventStage;
  if (currentStage === targetStage) return { success: true };

  const currentIndex = STAGES.indexOf(currentStage);
  const targetIndex = STAGES.indexOf(targetStage);

  // Never allow any transition once PUBLISHED
  if (currentStage === "PUBLISHED") {
    throw new Error("Published events are permanently locked. Stage cannot be modified.");
  }

  // Backward transition rules: require reason, cannot rollback from PUBLISHED
  if (targetIndex < currentIndex) {
    if (!reason || reason.trim().length < 5) {
      throw new Error("A descriptive reason (min 5 characters) is required to move back to an earlier stage.");
    }
  }

  // Prerequisite validations for forward transitions
  if (targetStage === "INVESTMENT_OPEN") {
    const { count: teamCount } = await adminClient.from("teams").select("*", { count: "exact", head: true }).eq("is_active", true);
    if ((teamCount ?? 0) < 2) {
      throw new Error("Cannot open investment round: At least 2 active teams are required.");
    }
  }

  if (targetStage === "VERIFICATION") {
    // Check if investments round has closed
    if (currentIndex < STAGES.indexOf("INVESTMENT_CLOSED")) {
      throw new Error("Investment round must be closed before entering Verification.");
    }
  }

  // Update event stage
  const { error: updateErr } = await adminClient
    .from("events")
    .update({ stage: targetStage, updated_at: new Date().toISOString() })
    .eq("id", event.id);

  if (updateErr) throw new Error(updateErr.message);

  // Write to immutable audit logs
  await adminClient.from("audit_logs").insert({
    actor_id: profile.id,
    action: "STAGE_CHANGE",
    entity: "events",
    entity_id: event.id,
    details: {
      from: currentStage,
      to: targetStage,
      reason: reason || "Normal stage advancement",
    },
  });

  revalidatePath("/", "layout");
  return { success: true, stage: targetStage };
}

/**
 * 2. UPDATE EVENT SETTINGS
 */
export async function updateEventSettings(formData: {
  name: string;
  initial_balance: number;
  weight_judge: number;
  weight_invest: number;
  reveal_received_totals: boolean;
}) {
  const profile = await requireRole(["admin"]);
  const adminClient = createAdminClient();

  const validated = eventSettingsSchema.parse(formData);

  const { data: event } = await adminClient.from("events").select("id, stage").limit(1).single();
  if (!event) throw new Error("Event not found.");

  // If stage is already at or past VERIFICATION, weights are locked
  const stageIndex = STAGES.indexOf(event.stage as EventStage);
  if (stageIndex >= STAGES.indexOf("VERIFICATION")) {
    throw new Error("Scoring weights are locked once the competition reaches Verification.");
  }

  // If stage is already past SETUP, initial_balance is locked
  if (stageIndex >= STAGES.indexOf("INVESTMENT_OPEN")) {
    const { data: currentEvent } = await adminClient.from("events").select("initial_balance").eq("id", event.id).single();
    if (currentEvent && currentEvent.initial_balance !== validated.initial_balance) {
      throw new Error("Initial investment balance cannot be modified once investments have opened.");
    }
  }

  const { error } = await adminClient
    .from("events")
    .update({
      name: validated.name,
      initial_balance: validated.initial_balance,
      weight_judge: validated.weight_judge,
      weight_invest: validated.weight_invest,
      reveal_received_totals: validated.reveal_received_totals,
      updated_at: new Date().toISOString(),
    })
    .eq("id", event.id);

  if (error) throw new Error(error.message);

  await adminClient.from("audit_logs").insert({
    actor_id: profile.id,
    action: "UPDATE_EVENT_SETTINGS",
    entity: "events",
    entity_id: event.id,
    details: validated,
  });

  revalidatePath("/admin");
  return { success: true };
}

/**
 * 3. CREATE INDIVIDUAL TEAM ACCOUNT
 */
export async function createTeamAccount(input: {
  team_no: number;
  name: string;
  failed_company: string;
  pitch_summary: string;
  email: string;
  presentation_order: number;
}) {
  const profile = await requireRole(["admin"]);
  const adminClient = createAdminClient();
  const validated = createTeamSchema.parse(input);

  const tempPassword = generateTempPassword();

  // 1. Create Supabase Auth user
  const { data: authUser, error: authErr } = await adminClient.auth.admin.createUser({
    email: validated.email.trim(),
    password: tempPassword,
    email_confirm: true,
    user_metadata: { display_name: validated.name },
  });

  if (authErr) throw new Error(`Auth provisioning error: ${authErr.message}`);

  // 2. Insert Profile with role 'team' and must_change_password: true
  const { error: profErr } = await adminClient.from("profiles").insert({
    id: authUser.user.id,
    role: "team",
    display_name: validated.name,
    is_active: true,
    must_change_password: true,
  });

  if (profErr) {
    await adminClient.auth.admin.deleteUser(authUser.user.id);
    throw new Error(`Profile creation error: ${profErr.message}`);
  }

  // 3. Insert Team record
  const { data: team, error: teamErr } = await adminClient
    .from("teams")
    .insert({
      profile_id: authUser.user.id,
      team_no: validated.team_no,
      name: validated.name,
      failed_company: validated.failed_company,
      pitch_summary: validated.pitch_summary,
      presentation_order: validated.presentation_order,
      presentation_status: "Pending",
      is_active: true,
    })
    .select()
    .single();

  if (teamErr) {
    await adminClient.auth.admin.deleteUser(authUser.user.id);
    throw new Error(`Team record creation error: ${teamErr.message}`);
  }

  await adminClient.from("audit_logs").insert({
    actor_id: profile.id,
    action: "PROVISION_TEAM",
    entity: "teams",
    entity_id: team.id,
    details: { team_no: validated.team_no, name: validated.name, email: validated.email },
  });

  revalidatePath("/admin/teams");
  return {
    success: true,
    team,
    credentials: {
      email: validated.email,
      tempPassword,
    },
  };
}

/**
 * 4. BULK IMPORT TEAMS VIA CSV
 */
export async function bulkImportTeams(
  rows: Array<{
    team_no: number;
    name: string;
    failed_company: string;
    pitch_summary: string;
    email: string;
    presentation_order?: number;
  }>
) {
  const profile = await requireRole(["admin"]);
  const results = [];
  const errors = [];

  for (const row of rows) {
    try {
      const res = await createTeamAccount({
        team_no: Number(row.team_no),
        name: row.name,
        failed_company: row.failed_company,
        pitch_summary: row.pitch_summary || `Strategy turnaround presentation for ${row.failed_company}`,
        email: row.email,
        presentation_order: Number(row.presentation_order || row.team_no),
      });
      results.push({
        team_no: row.team_no,
        name: row.name,
        email: row.email,
        tempPassword: res.credentials.tempPassword,
      });
    } catch (err: any) {
      errors.push({ team: row.name || row.email, error: err.message });
    }
  }

  return { success: true, created: results, errors };
}

/**
 * 5. CREATE INDIVIDUAL JUDGE ACCOUNT
 */
export async function createJudgeAccount(input: {
  display_name: string;
  email: string;
}) {
  const profile = await requireRole(["admin"]);
  const adminClient = createAdminClient();
  const validated = createJudgeSchema.parse(input);

  const tempPassword = generateTempPassword();

  const { data: authUser, error: authErr } = await adminClient.auth.admin.createUser({
    email: validated.email.trim(),
    password: tempPassword,
    email_confirm: true,
    user_metadata: { display_name: validated.display_name },
  });

  if (authErr) throw new Error(`Judge Auth provisioning error: ${authErr.message}`);

  const { error: profErr } = await adminClient.from("profiles").insert({
    id: authUser.user.id,
    role: "judge",
    display_name: validated.display_name,
    is_active: true,
    must_change_password: true,
  });

  if (profErr) {
    await adminClient.auth.admin.deleteUser(authUser.user.id);
    throw new Error(`Judge Profile error: ${profErr.message}`);
  }

  const { data: judge, error: judgeErr } = await adminClient
    .from("judges")
    .insert({
      profile_id: authUser.user.id,
      display_name: validated.display_name,
    })
    .select()
    .single();

  if (judgeErr) {
    await adminClient.auth.admin.deleteUser(authUser.user.id);
    throw new Error(`Judge record error: ${judgeErr.message}`);
  }

  await adminClient.from("audit_logs").insert({
    actor_id: profile.id,
    action: "PROVISION_JUDGE",
    entity: "judges",
    entity_id: judge.id,
    details: { display_name: validated.display_name, email: validated.email },
  });

  revalidatePath("/admin/judges");
  return {
    success: true,
    judge,
    credentials: {
      email: validated.email,
      tempPassword,
    },
  };
}

/**
 * 6. UPDATE PRESENTATION STATUS
 */
export async function updatePresentationStatus(
  teamId: string,
  status: "Pending" | "Presenting" | "Completed"
) {
  await requireRole(["admin"]);
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("teams")
    .update({ presentation_status: status, updated_at: new Date().toISOString() })
    .eq("id", teamId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/teams");
  return { success: true };
}

/**
 * 7. RESET USER PASSWORD (GENERATES NEW TEMP PASSWORD)
 */
export async function resetUserPassword(profileId: string) {
  const profile = await requireRole(["admin"]);
  const adminClient = createAdminClient();

  const tempPassword = generateTempPassword();

  const { error: authErr } = await adminClient.auth.admin.updateUserById(profileId, {
    password: tempPassword,
  });

  if (authErr) throw new Error(authErr.message);

  await adminClient
    .from("profiles")
    .update({ must_change_password: true, updated_at: new Date().toISOString() })
    .eq("id", profileId);

  await adminClient.from("audit_logs").insert({
    actor_id: profile.id,
    action: "RESET_USER_PASSWORD",
    entity: "profiles",
    entity_id: profileId,
    details: { reset_by: profile.id },
  });

  return { success: true, tempPassword };
}

/**
 * 8. REOPEN EVALUATION (ADMIN ONLY)
 */
export async function adminReopenEvaluation(evaluationId: string, reason: string) {
  await requireRole(["admin"]);
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("reopen_evaluation", {
    p_evaluation_id: evaluationId,
    p_reason: reason,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/evaluations");
  return data;
}

/**
 * 9. WAIVE EVALUATION (ADMIN ONLY)
 */
export async function adminWaiveEvaluation(judgeId: string, teamId: string, reason: string) {
  const profile = await requireRole(["admin"]);
  const adminClient = createAdminClient();

  if (!reason || reason.trim().length < 5) {
    throw new Error("A descriptive reason (min 5 characters) is required to waive an evaluation.");
  }

  const { error } = await adminClient.from("evaluation_waivers").upsert({
    judge_id: judgeId,
    team_id: teamId,
    reason: reason.trim(),
    admin_id: profile.id,
  });

  if (error) throw new Error(error.message);

  await adminClient.from("audit_logs").insert({
    actor_id: profile.id,
    action: "WAIVE_EVALUATION",
    entity: "evaluation_waivers",
    entity_id: `${judgeId}_${teamId}`,
    details: { judge_id: judgeId, team_id: teamId, reason },
  });

  revalidatePath("/admin/evaluations");
  return { success: true };
}

/**
 * 10. GENERATE RESULTS SNAPSHOT / PUBLISH RESULTS
 */
export async function runResultsCalculation(isPublished: boolean = false) {
  await requireRole(["admin"]);
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("generate_results_snapshot", {
    p_is_published: isPublished,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/admin/results");
  revalidatePath("/");
  return data;
}
