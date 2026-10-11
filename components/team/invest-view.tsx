"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  DollarSign,
  Search,
  CheckCircle2,
  Lock,
  ArrowLeft,
  Trash2,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { allocateInvestment, removeAllocation } from "@/app/team/actions";
import { formatPoints } from "@/lib/utils";

interface TargetTeamItem {
  id: string;
  team_no: number;
  name: string;
  failed_company: string;
  pitch_summary: string;
  current_allocation: number; // 0 if none
}

export function InvestView({
  eventStage,
  initialBalance,
  remainingBalance,
  targetTeams,
}: {
  eventStage: string;
  initialBalance: number;
  remainingBalance: number;
  targetTeams: TargetTeamItem[];
}) {
  const isRoundOpen = eventStage === "INVESTMENT_OPEN";
  const [search, setSearch] = React.useState("");

  // Investment Modal State
  const [modalOpen, setModalOpen] = React.useState(false);
  const [selectedTeam, setSelectedTeam] = React.useState<TargetTeamItem | null>(null);
  const [investAmount, setInvestAmount] = React.useState<number>(100);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const filteredTeams = targetTeams.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.failed_company.toLowerCase().includes(search.toLowerCase()) ||
      String(t.team_no).includes(search)
  );

  const openInvestModal = (team: TargetTeamItem) => {
    setSelectedTeam(team);
    // If team has existing allocation, start with that; otherwise default to 100 or remaining balance
    setInvestAmount(team.current_allocation > 0 ? team.current_allocation : Math.min(100, remainingBalance));
    setModalOpen(true);
  };

  // Max allocatable to this target = remainingBalance + current_allocation to this target
  const maxAvailableForSelected = selectedTeam
    ? remainingBalance + selectedTeam.current_allocation
    : remainingBalance;

  const handleConfirmInvestment = async () => {
    if (!selectedTeam) return;

    if (investAmount <= 0) {
      toast.error("Allocation must be a positive integer.");
      return;
    }

    if (investAmount > maxAvailableForSelected) {
      toast.error(
        `Insufficient balance. Maximum you can allocate to this team is ${maxAvailableForSelected} pts.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await allocateInvestment(selectedTeam.id, investAmount);
      toast.success(
        `Allocated ${investAmount} pts to ${selectedTeam.name} successfully!`
      );
      setModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to place investment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveExisting = async () => {
    if (!selectedTeam) return;
    setIsSubmitting(true);
    try {
      await removeAllocation(selectedTeam.id);
      toast.success(`Removed investment in ${selectedTeam.name}.`);
      setModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to remove allocation");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Balance */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/team"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Browse & Invest in Competitor Strategies
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Evaluate turnaround presentations and allocate your points to peer teams.
          </p>
        </div>

        {/* Live Balance Box */}
        <div className="flex items-center gap-3 bg-card border border-amber-500/30 px-4 py-2.5 rounded-xl shadow-sm">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Available Capital:
            </div>
            <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {formatPoints(remainingBalance)} pts
            </div>
          </div>
        </div>
      </div>

      {!isRoundOpen && (
        <div className="rounded-xl border border-border bg-muted/60 p-4 flex items-center gap-3 text-xs text-muted-foreground">
          <Lock className="h-4 w-4 text-amber-500 shrink-0" />
          <div>
            <strong>Investment Round Closed:</strong> Current competition stage is <strong>{eventStage}</strong>. Points can only be allocated during the <strong>INVESTMENT_OPEN</strong> stage.
          </div>
        </div>
      )}

      {/* Search / Filter Bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by company, team, or #..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 text-xs"
        />
      </div>

      {/* Competitor Team Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTeams.map((t) => {
          const hasInvested = t.current_allocation > 0;

          return (
            <Card
              key={t.id}
              className={`flex flex-col justify-between border-border hover:border-amber-500/40 transition-all ${
                hasInvested ? "border-amber-500/30 bg-amber-500/[0.02]" : ""
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold bg-muted px-2 py-0.5 rounded">
                      #{t.team_no}
                    </span>
                    <CardTitle className="text-base">{t.name}</CardTitle>
                  </div>
                  {hasInvested && (
                    <Badge variant="deal" className="text-[10px]">
                      Invested
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs font-semibold text-foreground pt-1">
                  Failed Case: <strong className="text-amber-600 dark:text-amber-400">{t.failed_company}</strong>
                </CardDescription>
              </CardHeader>

              <CardContent className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                {t.pitch_summary}
              </CardContent>

              <CardFooter className="pt-3 border-t border-border/50 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Your Allocation:
                  </div>
                  <div className="text-sm font-bold font-mono text-foreground">
                    {hasInvested ? `${formatPoints(t.current_allocation)} pts` : "0 pts"}
                  </div>
                </div>

                <Button
                  variant={hasInvested ? "outline" : "deal"}
                  size="sm"
                  disabled={!isRoundOpen}
                  onClick={() => openInvestModal(t)}
                  className="text-xs font-semibold"
                >
                  {hasInvested ? "Edit Allocation" : "Invest Points"}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Investment Dialog */}
      <Dialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedTeam ? `Invest in #${selectedTeam.team_no} ${selectedTeam.name}` : "Invest"}
        description={
          selectedTeam
            ? `Turnaround Case Study: ${selectedTeam.failed_company}`
            : ""
        }
      >
        {selectedTeam && (
          <div className="space-y-4 text-xs">
            <div className="rounded-lg bg-muted/60 p-3 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Available to Allocate:</span>
                <span className="font-mono font-bold text-foreground">
                  {formatPoints(maxAvailableForSelected)} pts
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Allocation to this Team:</span>
                <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                  {formatPoints(selectedTeam.current_allocation)} pts
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-semibold text-foreground block">
                Allocation Amount (Virtual Points)
              </label>
              <Input
                type="number"
                min="1"
                max={maxAvailableForSelected}
                value={investAmount}
                onChange={(e) => setInvestAmount(Number(e.target.value))}
                className="text-lg font-mono font-bold text-amber-600 dark:text-amber-400 h-11"
              />

              {/* Quick increment buttons */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[50, 100, 250, 500].map((inc) => (
                  <Button
                    key={inc}
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => setInvestAmount(Math.min(maxAvailableForSelected, inc))}
                    className="text-[11px] h-7 px-2"
                  >
                    {inc} pts
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setInvestAmount(maxAvailableForSelected)}
                  className="text-[11px] h-7 px-2 font-bold"
                >
                  Max All
                </Button>
              </div>
            </div>

            {/* Remaining Preview */}
            <div className="rounded-lg border border-border p-2.5 flex justify-between items-center text-[11px]">
              <span className="text-muted-foreground">Balance Remaining After Investment:</span>
              <span className="font-mono font-bold text-foreground">
                {formatPoints(Math.max(0, maxAvailableForSelected - investAmount))} pts
              </span>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-border">
              {selectedTeam.current_allocation > 0 ? (
                <Button
                  variant="destructive"
                  size="sm"
                  type="button"
                  onClick={handleRemoveExisting}
                  isLoading={isSubmitting}
                  className="text-xs gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  Remove Allocation
                </Button>
              ) : (
                <div />
              )}

              <div className="flex gap-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="deal"
                  size="sm"
                  type="button"
                  onClick={handleConfirmInvestment}
                  isLoading={isSubmitting}
                >
                  Confirm Allocation
                </Button>
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
