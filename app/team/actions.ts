"use server";

import { requireRole, getCurrentTeam } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { setInvestmentSchema } from "@/lib/validation";

/**
 * 1. ALLOCATE VIRTUAL INVESTMENT POINTS
 * Runs transactionally in PostgreSQL via SECURITY DEFINER function
 */
export async function allocateInvestment(targetTeamId: string, amount: number) {
  await requireRole(["team"]);
  const validated = setInvestmentSchema.parse({
    target_team_id: targetTeamId,
    amount: Number(amount),
  });

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("set_investment", {
    p_target_team_id: validated.target_team_id,
    p_amount: validated.amount,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/team");
  revalidatePath("/team/invest");
  return data;
}

/**
 * 2. REMOVE ALLOCATION
 */
export async function removeAllocation(targetTeamId: string) {
  await requireRole(["team"]);
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("remove_investment", {
    p_target_team_id: targetTeamId,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/team");
  revalidatePath("/team/invest");
  return data;
}
