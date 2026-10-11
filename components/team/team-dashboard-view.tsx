"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  Clock,
  Trash2,
  Edit2,
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { removeAllocation, allocateInvestment } from "@/app/team/actions";
import { formatPoints } from "@/lib/utils";

interface AllocationItem {
  id: string;
  target_team_id: string;
  amount: number;
  target: {
    team_no: number;
    name: string;
    failed_company: string;
  };
}

interface TeamEventItem {
  id: string;
  old_amount: number;
  new_amount: number;
  action: string;
  target_name: string;
  created_at: string;
}

interface TeamDashboardViewProps {
  team: {
    id: string;
    team_no: number;
    name: string;
    failed_company: string;
    pitch_summary: string;
    presentation_order: number;
    presentation_status: string;
  };
  eventStage: string;
  initialBalance: number;
  totalAllocated: number;
  remainingBalance: number;
  receivedPoints: number | null;
  allocations: AllocationItem[];
  history: TeamEventItem[];
}

export function TeamDashboardView({
  team,
  eventStage,
  initialBalance,
  totalAllocated,
  remainingBalance,
  receivedPoints,
  allocations,
  history,
}: TeamDashboardViewProps) {
  const isRoundOpen = eventStage === "INVESTMENT_OPEN";

  // Edit Allocation Modal State
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [editingTargetId, setEditingTargetId] = React.useState<string | null>(null);
  const [editingTargetName, setEditingTargetName] = React.useState<string>("");
  const [editAmount, setEditAmount] = React.useState<number>(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const percentageSpent = initialBalance > 0 ? Math.round((totalAllocated / initialBalance) * 100) : 0;

  const handleOpenEdit = (alloc: AllocationItem) => {
    setEditingTargetId(alloc.target_team_id);
    setEditingTargetName(alloc.target.name);
    setEditAmount(alloc.amount);
    setEditModalOpen(true);
  };

  const handleUpdateAllocation = async () => {
    if (!editingTargetId) return;
    if (editAmount <= 0) {
      toast.error("Allocation must be greater than 0");
      return;
    }

    setIsSubmitting(true);
    try {
      await allocateInvestment(editingTargetId, editAmount);
      toast.success(`Updated allocation for ${editingTargetName}!`);
      setEditModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update allocation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveAllocation = async (targetTeamId: string, teamName: string) => {
    try {
      await removeAllocation(targetTeamId);
      toast.success(`Removed allocation for ${teamName}.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to remove allocation");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Team Capital Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage your peer investment portfolio and monitor your presentation schedule.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isRoundOpen ? (
            <Link href="/team/invest">
              <Button variant="deal" size="sm" className="font-semibold gap-1.5 shadow-sm">
                <DollarSign className="h-4 w-4" />
                Browse & Allocate Points
              </Button>
            </Link>
          ) : (
            <Badge variant="outline" className="text-xs py-1 px-3">
              Investment Round: {eventStage.replace("_", " ")}
            </Badge>
          )}
        </div>
      </div>

      {/* Balance & Budget Meter */}
      <Card className="border-amber-500/30 bg-gradient-to-br from-card via-card to-amber-500/[0.03] shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-amber-500" />
                Virtual Investment Balance Meter
              </CardTitle>
              <CardDescription className="text-xs">
                Budget allocated to your team to invest in competitor presentations.
              </CardDescription>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                {formatPoints(remainingBalance)}
              </span>
              <span className="text-xs text-muted-foreground ml-1">pts available</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 to-amber-600 h-full transition-all duration-500 rounded-full"
              style={{ width: `${Math.min(100, percentageSpent)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span>Allocated: {formatPoints(totalAllocated)} pts ({percentageSpent}%)</span>
            <span>Total Initial Budget: {formatPoints(initialBalance)} pts</span>
          </div>

          {!isRoundOpen && (
            <div className="rounded-lg bg-muted/60 p-2.5 text-xs text-muted-foreground flex items-center gap-2 mt-2">
              <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>
                Investment modifications are locked because current stage is <strong>{eventStage}</strong>. Allocations cannot be changed.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Portfolio & Presentation Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Allocations (2 cols) */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Your Active Allocations</CardTitle>
              <CardDescription className="text-xs">
                Teams you have invested in. Each competitor has at most one allocation.
              </CardDescription>
            </div>
            {isRoundOpen && (
              <Link href="/team/invest">
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  Add Investment <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {allocations.length === 0 ? (
              <div className="p-12 text-center text-xs text-muted-foreground space-y-3">
                <p>You haven&apos;t allocated points to any teams yet.</p>
                {isRoundOpen && (
                  <Link href="/team/invest">
                    <Button variant="deal" size="sm">
                      Browse Teams Now
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-4 py-3">Target Team</th>
                      <th className="px-4 py-3">Case Study</th>
                      <th className="px-4 py-3 text-right">Points Allocated</th>
                      {isRoundOpen && <th className="px-4 py-3 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {allocations.map((a) => (
                      <tr key={a.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3 font-semibold text-foreground">
                          #{a.target.team_no} {a.target.name}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-medium">
                          {a.target.failed_company}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                          {formatPoints(a.amount)} pts
                        </td>
                        {isRoundOpen && (
                          <td className="px-4 py-3 text-right space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(a)}
                              className="h-7 px-2 text-xs"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveAllocation(a.target_team_id, a.target.name)}
                              className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Presentation & Received Points Status */}
        <div className="space-y-6">
          {/* Presentation Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Your Presentation</CardTitle>
              <CardDescription className="text-xs">Schedule and status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Order in Schedule:</span>
                <span className="font-bold text-foreground">#{team.presentation_order}</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Pitch Status:</span>
                <Badge variant={team.presentation_status === "Completed" ? "success" : "secondary"}>
                  {team.presentation_status}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Recovery Strategy Summary:</span>
                <p className="text-foreground bg-muted/40 p-2.5 rounded-lg text-[11px] leading-relaxed">
                  {team.pitch_summary}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Points Received Card (Strict Confidentiality Guard) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-ieee-600" />
                Capital Received
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs">
              {receivedPoints !== null ? (
                <div className="text-center py-2">
                  <div className="text-3xl font-bold font-mono text-amber-600 dark:text-amber-400">
                    {formatPoints(receivedPoints)} pts
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Total investment capital accumulated from peer teams
                  </p>
                </div>
              ) : (
                <div className="rounded-lg bg-muted/50 p-3 text-muted-foreground text-[11px] leading-relaxed">
                  Points received from other teams are strictly confidential during the event. Totals will be revealed once the final leaderboard is published by the organizing committee.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Allocation Dialog */}
      <Dialog
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Edit Investment in ${editingTargetName}`}
        description="Adjust points allocated to this team. Must not exceed your remaining balance."
      >
        <div className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-semibold text-muted-foreground">New Allocation Amount (Points)</label>
            <Input
              type="number"
              min="1"
              value={editAmount}
              onChange={(e) => setEditAmount(Number(e.target.value))}
              className="font-mono text-base font-bold"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="deal"
              size="sm"
              onClick={handleUpdateAllocation}
              isLoading={isSubmitting}
            >
              Update Allocation
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
