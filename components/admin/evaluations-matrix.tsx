"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ClipboardCheck, RotateCcw, ShieldAlert, CheckCircle2, Clock, Ban } from "lucide-react";
import { toast } from "sonner";
import { adminReopenEvaluation, adminWaiveEvaluation } from "@/app/admin/actions";

interface JudgeItem {
  id: string;
  display_name: string;
}

interface TeamItem {
  id: string;
  team_no: number;
  name: string;
}

interface EvaluationCell {
  judge_id: string;
  team_id: string;
  evaluation_id?: string;
  status: "none" | "draft" | "submitted" | "waived";
  waiver_reason?: string;
}

export function EvaluationsMatrix({
  judges,
  teams,
  matrix,
}: {
  judges: JudgeItem[];
  teams: TeamItem[];
  matrix: Record<string, EvaluationCell>; // key: `${judge_id}_${team_id}`
}) {
  // Reopen Modal
  const [reopenModalOpen, setReopenModalOpen] = React.useState(false);
  const [selectedEvalId, setSelectedEvalId] = React.useState<string | null>(null);
  const [reopenReason, setReopenReason] = React.useState("");
  const [isReopening, setIsReopening] = React.useState(false);

  // Waive Modal
  const [waiveModalOpen, setWaiveModalOpen] = React.useState(false);
  const [selectedJudgeId, setSelectedJudgeId] = React.useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = React.useState<string | null>(null);
  const [waiveReason, setWaiveReason] = React.useState("");
  const [isWaiving, setIsWaiving] = React.useState(false);

  const handleReopen = async () => {
    if (!selectedEvalId) return;
    if (reopenReason.trim().length < 5) {
      toast.error("Please provide a reason with at least 5 characters.");
      return;
    }

    setIsReopening(true);
    try {
      await adminReopenEvaluation(selectedEvalId, reopenReason);
      toast.success("Evaluation reopened! The judge can now update their scores.");
      setReopenModalOpen(false);
      setReopenReason("");
    } catch (err: any) {
      toast.error(err.message || "Failed to reopen evaluation");
    } finally {
      setIsReopening(false);
    }
  };

  const handleWaive = async () => {
    if (!selectedJudgeId || !selectedTeamId) return;
    if (waiveReason.trim().length < 5) {
      toast.error("Please provide a waiver reason with at least 5 characters.");
      return;
    }

    setIsWaiving(true);
    try {
      await adminWaiveEvaluation(selectedJudgeId, selectedTeamId, waiveReason);
      toast.success("Evaluation pair waived with audit record.");
      setWaiveModalOpen(false);
      setWaiveReason("");
    } catch (err: any) {
      toast.error(err.message || "Failed to waive evaluation");
    } finally {
      setIsWaiving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Judge Evaluation Matrix
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Monitor real-time completion per judge × team, reopen submitted evaluations, or log official waivers.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {judges.length === 0 || teams.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              Add judges and teams to view the evaluation matrix.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-3 sticky left-0 bg-muted z-10">Judge Name</th>
                    {teams.map((t) => (
                      <th key={t.id} className="px-3 py-3 text-center min-w-[130px]">
                        <div>#{t.team_no}</div>
                        <div className="truncate max-w-[120px] font-normal normal-case">{t.name}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {judges.map((judge) => (
                    <tr key={judge.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-semibold text-foreground sticky left-0 bg-background z-10 whitespace-nowrap">
                        {judge.display_name}
                      </td>
                      {teams.map((team) => {
                        const cell = matrix[`${judge.id}_${team.id}`] || {
                          judge_id: judge.id,
                          team_id: team.id,
                          status: "none",
                        };

                        return (
                          <td key={team.id} className="px-3 py-3 text-center">
                            {cell.status === "submitted" ? (
                              <div className="inline-flex flex-col items-center gap-1">
                                <Badge variant="success" className="text-[10px] gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Submitted
                                </Badge>
                                {cell.evaluation_id && (
                                  <button
                                    onClick={() => {
                                      setSelectedEvalId(cell.evaluation_id!);
                                      setReopenModalOpen(true);
                                    }}
                                    className="text-[10px] text-muted-foreground hover:text-amber-500 underline flex items-center gap-0.5 mt-0.5"
                                  >
                                    <RotateCcw className="h-2.5 w-2.5" />
                                    Reopen
                                  </button>
                                )}
                              </div>
                            ) : cell.status === "draft" ? (
                              <Badge variant="deal" className="text-[10px] gap-1">
                                <Clock className="h-3 w-3" />
                                Draft Saved
                              </Badge>
                            ) : cell.status === "waived" ? (
                              <Badge variant="secondary" className="text-[10px] gap-1 font-mono">
                                <Ban className="h-3 w-3" />
                                Waived
                              </Badge>
                            ) : (
                              <div className="inline-flex flex-col items-center gap-1">
                                <span className="text-[11px] text-muted-foreground italic">
                                  Pending
                                </span>
                                <button
                                  onClick={() => {
                                    setSelectedJudgeId(judge.id);
                                    setSelectedTeamId(team.id);
                                    setWaiveModalOpen(true);
                                  }}
                                  className="text-[10px] text-muted-foreground hover:text-red-500 underline"
                                >
                                  Waive Pair
                                </button>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reopen Evaluation Dialog */}
      <Dialog
        isOpen={reopenModalOpen}
        onClose={() => setReopenModalOpen(false)}
        title="Reopen Submitted Evaluation"
        description="Return this evaluation to draft status so the judge can modify their scores. A documented reason is required."
      >
        <div className="space-y-3 text-xs">
          <div className="space-y-1.5">
            <label className="font-semibold text-muted-foreground">Reason for Reopening</label>
            <Input
              placeholder="e.g. Judge requested edit for presentation Q&A criterion score..."
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setReopenModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="deal" size="sm" onClick={handleReopen} isLoading={isReopening}>
              Confirm Reopen
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Waive Evaluation Dialog */}
      <Dialog
        isOpen={waiveModalOpen}
        onClose={() => setWaiveModalOpen(false)}
        title="Waive Evaluation Pair"
        description="Mark this judge × team evaluation as waived (e.g. conflict of interest or technical disconnection). This pair will be excluded from the team's average score with a permanent audit record."
      >
        <div className="space-y-3 text-xs">
          <div className="space-y-1.5">
            <label className="font-semibold text-muted-foreground">Reason for Waiver</label>
            <Input
              placeholder="e.g. Judge declared mentor conflict of interest with team..."
              value={waiveReason}
              onChange={(e) => setWaiveReason(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setWaiveModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleWaive} isLoading={isWaiving}>
              Confirm Waiver
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
