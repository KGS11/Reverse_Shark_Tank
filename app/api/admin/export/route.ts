import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateSafeCSV, logCSVExport } from "@/lib/csv/export-helpers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const profile = await requireRole(["admin"]);
    const admin = createAdminClient();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    let data: Record<string, any>[] = [];
    let filename = `export-${type}-${Date.now()}.csv`;

    if (type === "results") {
      const { data: snapshot } = await admin
        .from("results_snapshots")
        .select("id, status, weight_judge, weight_invest, published_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!snapshot) {
        return new NextResponse("No results snapshot found", { status: 404 });
      }

      const { data: rows } = await admin
        .from("result_rows")
        .select(`
          rank,
          team:teams(team_no, name, failed_company),
          avg_judge_score,
          points_received,
          investment_score,
          final_score
        `)
        .eq("snapshot_id", snapshot.id)
        .order("rank", { ascending: true });

      data = (rows || []).map((r: any) => ({
        Rank: r.rank,
        TeamNumber: r.team?.team_no,
        TeamName: r.team?.name,
        FailedCompany: r.team?.failed_company,
        JudgeAverageScore: r.avg_judge_score,
        PointsReceived: r.points_received,
        InvestmentScore: r.investment_score,
        FinalScore: r.final_score,
      }));
      filename = `competition-results-${snapshot.status}-${Date.now()}.csv`;
    } else if (type === "investments-summary") {
      const { data: teams } = await admin.from("teams").select("id, team_no, name").eq("is_active", true);
      const { data: investments } = await admin.from("investments").select("investor_team_id, target_team_id, amount");

      const received: Record<string, number> = {};
      const allocated: Record<string, number> = {};

      for (const inv of investments || []) {
        received[inv.target_team_id] = (received[inv.target_team_id] || 0) + inv.amount;
        allocated[inv.investor_team_id] = (allocated[inv.investor_team_id] || 0) + inv.amount;
      }

      data = (teams || []).map((t) => ({
        TeamNumber: t.team_no,
        TeamName: t.name,
        PointsReceived: received[t.id] || 0,
        PointsAllocated: allocated[t.id] || 0,
      }));
      filename = `investments-summary-${Date.now()}.csv`;
    } else if (type === "investments-history") {
      const { data: events } = await admin
        .from("investment_events")
        .select(`
          created_at,
          investor:teams!investment_events_investor_team_id_fkey(team_no, name),
          target:teams!investment_events_target_team_id_fkey(team_no, name),
          old_amount,
          new_amount,
          action,
          reason
        `)
        .order("created_at", { ascending: false });

      data = (events || []).map((e: any) => ({
        Timestamp: e.created_at,
        InvestorTeam: e.investor?.name,
        TargetTeam: e.target?.name,
        OldAmount: e.old_amount,
        NewAmount: e.new_amount,
        Action: e.action,
        Reason: e.reason || "",
      }));
      filename = `investments-history-${Date.now()}.csv`;
    } else if (type === "evaluations") {
      const { data: scores } = await admin
        .from("evaluation_scores")
        .select(`
          evaluation:evaluations(
            judge:judges(display_name),
            team:teams(team_no, name),
            status,
            submitted_at
          ),
          criterion:criteria(name, max_score, weight),
          score
        `);

      data = (scores || []).map((s: any) => ({
        Judge: s.evaluation?.judge?.display_name,
        TeamNumber: s.evaluation?.team?.team_no,
        TeamName: s.evaluation?.team?.name,
        Status: s.evaluation?.status,
        Criterion: s.criterion?.name,
        MaxScore: s.criterion?.max_score,
        Weight: s.criterion?.weight,
        Score: s.score,
        SubmittedAt: s.evaluation?.submitted_at || "",
      }));
      filename = `evaluations-scores-${Date.now()}.csv`;
    } else if (type === "audit-log") {
      const { data: logs } = await admin
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false });

      data = (logs || []).map((l) => ({
        Timestamp: l.created_at,
        ActorID: l.actor_id,
        Action: l.action,
        Entity: l.entity,
        EntityID: l.entity_id || "",
        Details: JSON.stringify(l.details),
      }));
      filename = `audit-logs-${Date.now()}.csv`;
    } else {
      return new NextResponse("Invalid export type parameter", { status: 400 });
    }

    // Log the export action
    await logCSVExport(profile.id, type, data.length);

    // Return safe CSV with headers
    const csvContent = generateSafeCSV(data);
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    return new NextResponse(err.message || "Export failed", { status: 500 });
  }
}
