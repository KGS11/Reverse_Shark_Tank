import { requireRole, getCurrentTeam } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { TeamDashboardView } from "@/components/team/team-dashboard-view";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  await requireRole(["team"]);
  const team = await getCurrentTeam();
  const supabase = await createClient();

  // 1. Fetch Event settings
  const { data: event } = await supabase.from("events").select("stage, initial_balance, reveal_received_totals").limit(1).single();

  const initialBalance = event?.initial_balance || 1000;
  const currentStage = event?.stage || "SETUP";

  // 2. Fetch Own Allocations (RLS allows only where investor_team_id = own team id)
  const { data: allocations } = await supabase
    .from("investments")
    .select(`
      id,
      target_team_id,
      amount,
      target:teams!investments_target_team_id_fkey(
        team_no,
        name,
        failed_company
      )
    `)
    .eq("investor_team_id", team.id);

  const allAllocations = (allocations as any) || [];
  const totalAllocated = allAllocations.reduce((sum: number, a: any) => sum + a.amount, 0);
  const remainingBalance = initialBalance - totalAllocated;

  // 3. Controlled fetch of points received
  const { data: receivedPoints } = await supabase.rpc("get_team_received_points_controlled", {
    p_team_id: team.id,
  });

  // 4. Fetch own investment history
  const { data: historyRaw } = await supabase
    .from("investment_events")
    .select(`
      id,
      old_amount,
      new_amount,
      action,
      created_at,
      target:teams!investment_events_target_team_id_fkey(name)
    `)
    .eq("investor_team_id", team.id)
    .order("created_at", { ascending: false })
    .limit(30);

  const history = (historyRaw || []).map((h: any) => ({
    id: h.id,
    old_amount: h.old_amount,
    new_amount: h.new_amount,
    action: h.action,
    target_name: h.target?.name || "Team",
    created_at: h.created_at,
  }));

  return (
    <TeamDashboardView
      team={team}
      eventStage={currentStage}
      initialBalance={initialBalance}
      totalAllocated={totalAllocated}
      remainingBalance={remainingBalance}
      receivedPoints={receivedPoints}
      allocations={allAllocations}
      history={history}
    />
  );
}
