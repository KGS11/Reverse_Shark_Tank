"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trophy,
  Sparkles,
  Lock,
  RefreshCw,
  Send,
  Eye,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { runResultsCalculation } from "@/app/admin/actions";
import { formatPoints, formatScore } from "@/lib/utils";

interface VerificationChecklist {
  investmentsLocked: boolean;
  allEvaluationsResolved: boolean;
  pendingEvaluationsCount: number;
  weightsValid: boolean;
  weightsSum: number;
  teamsCount: number;
  readyToPublish: boolean;
}

interface ResultRow {
  rank: number;
  team_id: string;
  avg_judge_score: number;
  points_received: number;
  investment_score: number;
  final_score: number;
  team: {
    team_no: number;
    name: string;
    failed_company: string;
  };
}

interface SnapshotData {
  id: string;
  status: "preview" | "published";
  weight_judge: number;
  weight_invest: number;
  highest_investment_points: number;
  created_at: string;
  published_at?: string;
  rows: ResultRow[];
}

export function ResultsManager({
  stage,
  checklist,
  currentSnapshot,
}: {
  stage: string;
  checklist: VerificationChecklist;
  currentSnapshot: SnapshotData | null;
}) {
  const [isCalculating, setIsCalculating] = React.useState(false);
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [publishModalOpen, setPublishModalOpen] = React.useState(false);

  const isPublished = stage === "PUBLISHED" || currentSnapshot?.status === "published";

  const handleGeneratePreview = async () => {
    setIsCalculating(true);
    try {
      await runResultsCalculation(false);
      toast.success("Preview snapshot calculated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to calculate preview");
    } finally {
      setIsCalculating(false);
    }
  };

  const handleConfirmPublish = async () => {
    setIsPublishing(true);
    try {
      await runResultsCalculation(true);
      toast.success("Competition results published successfully! The public leaderboard is live.");
      setPublishModalOpen(false);

      // Trigger celebratory confetti
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to publish results");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Verification & Results Publication
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Audit competition checklist, preview scoring calculations, and publish final immutable leaderboard.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isPublished ? (
            <Badge variant="success" className="gap-1.5 text-xs px-3 py-1">
              <Lock className="h-3.5 w-3.5" />
              Results Published & Immutable
            </Badge>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGeneratePreview}
                isLoading={isCalculating}
                className="gap-1.5 text-xs font-semibold"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Recalculate Preview
              </Button>

              <Button
                variant="deal"
                size="sm"
                onClick={() => setPublishModalOpen(true)}
                disabled={!checklist.readyToPublish}
                className="gap-1.5 text-xs font-semibold"
              >
                <Send className="h-3.5 w-3.5" />
                Publish Results
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Verification Checklist */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-ieee-600" />
            Pre-Publication Verification Checklist
          </CardTitle>
          <CardDescription>
            All critical business rules and data requirements must be satisfied before final publication.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Rule 1: Investment Locked */}
            <div className="flex items-start gap-2.5 p-3 rounded-lg border border-border bg-background">
              {checklist.investmentsLocked ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-semibold text-foreground">Investment Round Locked</div>
                <div className="text-muted-foreground">
                  {checklist.investmentsLocked
                    ? "Investments are closed. Allocations are immutable."
                    : "Investment round is still open or setup. Advance stage to INVESTMENT_CLOSED."}
                </div>
              </div>
            </div>

            {/* Rule 2: All evaluations resolved */}
            <div className="flex items-start gap-2.5 p-3 rounded-lg border border-border bg-background">
              {checklist.allEvaluationsResolved ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-semibold text-foreground">Evaluations Completed or Waived</div>
                <div className="text-muted-foreground">
                  {checklist.allEvaluationsResolved
                    ? "All judge × team evaluation pairs are submitted or explicitly waived."
                    : `${checklist.pendingEvaluationsCount} evaluation pairs pending submission or waiver.`}
                </div>
              </div>
            </div>

            {/* Rule 3: Valid Weights */}
            <div className="flex items-start gap-2.5 p-3 rounded-lg border border-border bg-background">
              {checklist.weightsValid ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-semibold text-foreground">Weight Calibration Invariant</div>
                <div className="text-muted-foreground">
                  {checklist.weightsValid
                    ? `Weights sum to exactly 100% (${checklist.weightsSum}%).`
                    : `Invalid weights: current sum is ${checklist.weightsSum}%.`}
                </div>
              </div>
            </div>

            {/* Rule 4: Active Teams */}
            <div className="flex items-start gap-2.5 p-3 rounded-lg border border-border bg-background">
              {checklist.teamsCount >= 2 ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-semibold text-foreground">Team Quorum Check</div>
                <div className="text-muted-foreground">
                  {checklist.teamsCount >= 2
                    ? `${checklist.teamsCount} active competing teams registered.`
                    : "At least 2 active teams required for competition."}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard Table (Preview / Published) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              {isPublished ? "Official Published Results" : "Live Scoring Breakdown (Preview)"}
            </CardTitle>
            <CardDescription>
              {currentSnapshot
                ? `Calculated on ${new Date(currentSnapshot.created_at).toLocaleTimeString()} with Weights: Judges (${currentSnapshot.weight_judge}%) + Investment (${currentSnapshot.weight_invest}%)`
                : "No preview generated yet. Click 'Recalculate Preview' above."}
            </CardDescription>
          </div>

          {currentSnapshot && (
            <Badge variant={currentSnapshot.status === "published" ? "success" : "secondary"}>
              {currentSnapshot.status.toUpperCase()}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {!currentSnapshot || currentSnapshot.rows.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              Click &quot;Recalculate Preview&quot; above to run the scoring engine across all current submissions.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-center">Rank</th>
                    <th className="px-4 py-3">Team & Case Study</th>
                    <th className="px-4 py-3 text-right">Judge Avg (0-100)</th>
                    <th className="px-4 py-3 text-right">Points Received</th>
                    <th className="px-4 py-3 text-right">Investment Score</th>
                    <th className="px-4 py-3 text-right font-bold text-foreground">Final Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-medium">
                  {currentSnapshot.rows.map((row) => (
                    <tr
                      key={row.team_id}
                      className={`hover:bg-muted/40 transition-colors ${
                        row.rank === 1 ? "bg-amber-500/5 font-semibold" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                            row.rank === 1
                              ? "bg-amber-400 text-amber-950 font-bold"
                              : row.rank === 2
                              ? "bg-slate-300 text-slate-900"
                              : row.rank === 3
                              ? "bg-amber-700 text-amber-100"
                              : "text-muted-foreground"
                          }`}
                        >
                          {row.rank}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground text-sm">
                          {row.team?.name || `Team ${row.team?.team_no}`}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Failed Company: <strong className="text-foreground">{row.team?.failed_company}</strong>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap font-mono">
                        {formatScore(row.avg_judge_score)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap font-mono text-amber-600 dark:text-amber-400">
                        {formatPoints(row.points_received)} pts
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap font-mono">
                        {formatScore(row.investment_score)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap font-mono text-sm font-bold text-ieee-600 dark:text-ieee-400">
                        {formatScore(row.final_score)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Publish Confirmation Dialog */}
      <Dialog
        isOpen={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        title="Publish Final Results & Lock Competition"
        description="This action is permanently irreversible via the user interface. Are you sure you want to proceed?"
      >
        <div className="space-y-4 text-xs">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-900 dark:text-amber-200">
            <div className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              Permanent Publication Notice
            </div>
            <ul className="list-disc list-inside mt-2 space-y-1 pl-1">
              <li>The public leaderboard will immediately reflect this published snapshot.</li>
              <li>Further edits to investments, evaluations, or criteria will be rejected at the database level.</li>
              <li>An official publication timestamp and audit entry will be generated.</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setPublishModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="deal"
              size="sm"
              onClick={handleConfirmPublish}
              isLoading={isPublishing}
              className="font-bold"
            >
              Confirm & Publish Now
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
