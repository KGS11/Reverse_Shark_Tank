import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { AdminDashboardView } from "@/components/admin/admin-dashboard-view";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();

  // 1. Fetch Event Settings
  const { data: event } = await supabase.from("events").select("*").limit(1).single();

  // 2. Fetch Teams
  const { data: teams } = await supabase.from("teams").select("id, name, team_no, is_active, presentation_status");
  const allTeams = teams || [];
  const activeTeams = allTeams.filter((t) => t.is_active);
  const completedPresentations = allTeams.filter((t) => t.presentation_status === "Completed").length;

  // 3. Fetch Judges
  const { count: totalJudges } = await supabase.from("judges").select("*", { count: "exact", head: true });

  // 4. Fetch Investments
  const { data: investments } = await supabase.from("investments").select("investor_team_id, target_team_id, amount");
  const allInvestments = investments || [];
  const totalInvestedPoints = allInvestments.reduce((sum, i) => sum + i.amount, 0);
  const initialBalance = event?.initial_balance || 1000;
  const totalExpectedInvestment = activeTeams.length * initialBalance;

  // 5. Team points received chart data
  const targetSums: Record<string, number> = {};
  for (const inv of allInvestments) {
    targetSums[inv.target_team_id] = (targetSums[inv.target_team_id] || 0) + inv.amount;
  }

  const teamInvestmentsData = activeTeams.map((t) => ({
    name: t.name,
    points: targetSums[t.id] || 0,
  }));

  // 6. Teams that haven't invested anything yet
  const investorSet = new Set(allInvestments.map((i) => i.investor_team_id));
  const zeroInvestmentTeams = activeTeams.filter((t) => !investorSet.has(t.id)).map((t) => t.name);

  // 7. Recent investment events
  const { data: recentEventsRaw } = await supabase
    .from("investment_events")
    .select(`
      id,
      old_amount,
      new_amount,
      action,
      created_at,
      investor:teams!investment_events_investor_team_id_fkey(name),
      target:teams!investment_events_target_team_id_fkey(name)
    `)
    .order("created_at", { ascending: false })
    .limit(10);

  const recentEvents = (recentEventsRaw || []).map((ev: any) => ({
    id: ev.id,
    investor_name: ev.investor?.name || "Team",
    target_name: ev.target?.name || "Team",
    amount: ev.new_amount,
    action: ev.action,
    created_at: ev.created_at,
  }));

  // 8. Evaluations stats
  const { count: totalSubmittedEvals } = await supabase
    .from("evaluations")
    .select("*", { count: "exact", head: true })
    .eq("status", "submitted");

  const totalEvaluationsExpected = (totalJudges || 0) * activeTeams.length;

  return (
    <AdminDashboardView
      event={
        event || {
          id: "",
          name: "Reverse Shark Tank",
          stage: "SETUP",
          initial_balance: 1000,
          weight_judge: 60,
          weight_invest: 40,
          reveal_received_totals: false,
        }
      }
      metrics={{
        totalTeams: allTeams.length,
        activeTeams: activeTeams.length,
        totalJudges: totalJudges || 0,
        presentationsCompleted: completedPresentations,
        totalInvestedPoints,
        totalExpectedInvestment,
        totalEvaluationsSubmitted: totalSubmittedEvals || 0,
        totalEvaluationsExpected,
      }}
      teamInvestmentsData={teamInvestmentsData}
      recentEvents={recentEvents}
      zeroInvestmentTeams={zeroInvestmentTeams}
    />
  );
}
