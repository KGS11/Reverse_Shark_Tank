import { requireRole, getCurrentJudge } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, Award, CheckCircle2, RotateCcw } from "lucide-react";
import { formatScore } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function JudgeHistoryPage() {
  await requireRole(["judge"]);
  const judge = await getCurrentJudge();
  const supabase = await createClient();

  const { data: history } = await supabase
    .from("evaluation_history")
    .select(`
      id,
      action,
      normalized_score,
      reason,
      created_at,
      team:teams(team_no, name, failed_company)
    `)
    .eq("judge_id", judge.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Your Evaluation History
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Immutable snapshot history of your submissions and any administrative reopening records.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {!history || history.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No evaluation history recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Team Evaluated</th>
                    <th className="px-4 py-3 text-center">Action</th>
                    <th className="px-4 py-3 text-right">Normalized Score</th>
                    <th className="px-4 py-3">Audit Details / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {history.map((h: any) => (
                    <tr key={h.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(h.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        #{h.team?.team_no} {h.team?.name}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={h.action === "submitted" ? "success" : "deal"}
                          className="text-[10px] uppercase font-mono"
                        >
                          {h.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                        {h.normalized_score ? `${formatScore(h.normalized_score)} / 100` : "-"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-[11px]">
                        {h.reason || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
