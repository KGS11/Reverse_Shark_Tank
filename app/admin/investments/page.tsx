import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { InvestmentsMonitor } from "@/components/admin/investments-monitor";

export const dynamic = "force-dynamic";

export default async function AdminInvestmentsPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();

  // 1. Fetch Event
  const { data: event } = await supabase.from("events").select("stage, initial_balance").limit(1).single();

  // 2. Fetch Active Teams
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, team_no")
    .eq("is_active", true)
    .order("team_no", { ascending: true });

  // 3. Fetch Investments
  const { data: investments } = await supabase.from("investments").select("investor_team_id, target_team_id, amount");

  const initialBalance = event?.initial_balance || 1000;
  const allInvestments = investments || [];

  // Group received and allocated
  const receivedMap: Record<string, number> = {};
  const allocatedMap: Record<string, number> = {};

  for (const inv of allInvestments) {
    receivedMap[inv.target_team_id] = (receivedMap[inv.target_team_id] || 0) + inv.amount;
    allocatedMap[inv.investor_team_id] = (allocatedMap[inv.investor_team_id] || 0) + inv.amount;
  }

  const teamSummaries = (teams || []).map((t) => {
    const allocated = allocatedMap[t.id] || 0;
    return {
      team_id: t.id,
      team_no: t.team_no,
      name: t.name,
      points_received: receivedMap[t.id] || 0,
      points_allocated: allocated,
      remaining_balance: initialBalance - allocated,
    };
  });

  // 4. Fetch History Events
  const { data: eventsRaw } = await supabase
    .from("investment_events")
    .select(`
      id,
      old_amount,
      new_amount,
      action,
      reason,
      created_at,
      investor:teams!investment_events_investor_team_id_fkey(name),
      target:teams!investment_events_target_team_id_fkey(name)
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  const events = (eventsRaw || []).map((e: any) => ({
    id: e.id,
    investor_name: e.investor?.name || "Team",
    target_name: e.target?.name || "Team",
    old_amount: e.old_amount,
    new_amount: e.new_amount,
    action: e.action,
    reason: e.reason,
    created_at: e.created_at,
  }));

  return (
    <InvestmentsMonitor
      stage={event?.stage || "SETUP"}
      initialBalance={initialBalance}
      teamSummaries={teamSummaries}
      events={events}
    />
  );
}
