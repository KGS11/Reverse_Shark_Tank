import { requireRole, getCurrentTeam } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { InvestView } from "@/components/team/invest-view";

export const dynamic = "force-dynamic";

export default async function TeamInvestPage() {
  await requireRole(["team"]);
  const myTeam = await getCurrentTeam();
  const supabase = await createClient();

  // 1. Fetch Event Stage and Initial Balance
  const { data: event } = await supabase.from("events").select("stage, initial_balance").limit(1).single();

  const initialBalance = event?.initial_balance || 1000;
  const currentStage = event?.stage || "SETUP";

  // 2. Fetch Other Active Teams (Strictly exclude self!)
  const { data: otherTeams } = await supabase
    .from("teams")
    .select("id, team_no, name, failed_company, pitch_summary")
    .eq("is_active", true)
    .neq("id", myTeam.id)
    .order("presentation_order", { ascending: true })
    .order("team_no", { ascending: true });

  // 3. Fetch My Existing Allocations
  const { data: myInvestments } = await supabase
    .from("investments")
    .select("target_team_id, amount")
    .eq("investor_team_id", myTeam.id);

  const allocationMap = new Map<string, number>();
  let totalAllocated = 0;
  for (const inv of myInvestments || []) {
    allocationMap.set(inv.target_team_id, inv.amount);
    totalAllocated += inv.amount;
  }

  const remainingBalance = initialBalance - totalAllocated;

  // 4. Combine into target teams items
  const targetTeams = (otherTeams || []).map((t) => ({
    id: t.id,
    team_no: t.team_no,
    name: t.name,
    failed_company: t.failed_company,
    pitch_summary: t.pitch_summary,
    current_allocation: allocationMap.get(t.id) || 0,
  }));

  return (
    <InvestView
      eventStage={currentStage}
      initialBalance={initialBalance}
      remainingBalance={remainingBalance}
      targetTeams={targetTeams}
    />
  );
}
