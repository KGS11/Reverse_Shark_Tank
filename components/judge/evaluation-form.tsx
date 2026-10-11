"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Award,
  ArrowLeft,
  Save,
  Send,
  CheckCircle2,
  Lock,
  RotateCcw,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { saveEvaluationDraft, submitEvaluationFinal } from "@/app/judge/actions";
import { formatScore } from "@/lib/utils";

interface CriterionData {
  id: string;
  name: string;
  description: string;
  max_score: number;
  weight: number;
}

interface EvaluationFormProps {
  team: {
    id: string;
    team_no: number;
    name: string;
    failed_company: string;
    pitch_summary: string;
  };
  criteria: CriterionData[];
  initialScores: Record<string, number>; // criterion_id -> score
  status: "none" | "draft" | "submitted";
  isJudgingOpen: boolean;
  eventStage: string;
  reopenReason?: string | null;
}

export function EvaluationForm({
  team,
  criteria,
  initialScores,
  status,
  isJudgingOpen,
  eventStage,
  reopenReason,
}: EvaluationFormProps) {
  const router = useRouter();
  const [scores, setScores] = React.useState<Record<string, number>>(initialScores);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const isReadOnly = status === "submitted" || !isJudgingOpen;

  const handleScoreChange = (criterionId: string, val: number, maxScore: number) => {
    if (isReadOnly) return;
    const clamped = Math.max(0, Math.min(maxScore, val));
    setScores((prev) => ({
      ...prev,
      [criterionId]: clamped,
    }));
  };

  // Compute live running total on 0-100 scale
  let runningNormalizedTotal = 0;
  for (const crit of criteria) {
    const raw = scores[crit.id] ?? 0;
    if (crit.max_score > 0) {
      runningNormalizedTotal += (raw / crit.max_score) * crit.weight;
    }
  }

  const allScored = criteria.every(
    (c) => scores[c.id] !== undefined && scores[c.id] !== null && !isNaN(scores[c.id])
  );

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const payload = criteria.map((c) => ({
        criterion_id: c.id,
        score: scores[c.id] ?? 0,
      }));

      await saveEvaluationDraft(team.id, payload);
      toast.success("Draft saved successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save draft");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitFinal = async () => {
    if (!allScored) {
      toast.error("All criteria must be scored before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = criteria.map((c) => ({
        criterion_id: c.id,
        score: scores[c.id] ?? 0,
      }));

      await submitEvaluationFinal(team.id, payload);
      toast.success("Evaluation submitted successfully!");
      router.push("/judge");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit evaluation");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Back button & team header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <Link
            href="/judge"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Evaluation Board
          </Link>
          <div className="flex items-center gap-3">
            <span className="font-mono text-base font-bold bg-muted px-2.5 py-0.5 rounded">
              #{team.team_no}
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {team.name}
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Turnaround Case Study: <strong className="text-amber-600 dark:text-amber-400">{team.failed_company}</strong>
          </p>
        </div>

        {/* Live Running Total Score Box */}
        <div className="flex items-center gap-3 bg-card border border-border px-4 py-2.5 rounded-xl shadow-sm">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Running Normalized Total:
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {formatScore(runningNormalizedTotal)}
              <span className="text-xs font-normal text-muted-foreground ml-1">/ 100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pitch Summary Callout */}
      <Card className="border-border bg-muted/30">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-xs uppercase font-semibold text-muted-foreground">
            Presented Recovery Strategy
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 pt-0 text-xs text-foreground leading-relaxed">
          {team.pitch_summary}
        </CardContent>
      </Card>

      {/* Notices */}
      {reopenReason && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
          <RotateCcw className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <strong>Evaluation Reopened by Admin:</strong> {reopenReason}
          </div>
        </div>
      )}

      {status === "submitted" && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <div>
            <strong>Submitted:</strong> Your evaluation for this team is finalized. If you need to make changes, please contact the competition administrator to reopen it.
          </div>
        </div>
      )}

      {!isJudgingOpen && (
        <div className="rounded-xl border border-border bg-muted/60 p-3 text-xs text-muted-foreground flex items-center gap-2.5">
          <Lock className="h-4 w-4 text-amber-500 shrink-0" />
          <div>
            Judging is currently locked (Stage: <strong>{eventStage}</strong>).
          </div>
        </div>
      )}

      {/* Criteria Scoring Form */}
      <div className="space-y-4">
        {criteria.map((c, index) => {
          const currentScore = scores[c.id] ?? 0;
          const weightedContribution = c.max_score > 0 ? (currentScore / c.max_score) * c.weight : 0;

          return (
            <Card key={c.id} className="border-border">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-muted-foreground">
                        Criterion {index + 1}
                      </span>
                      <CardTitle className="text-base">{c.name}</CardTitle>
                    </div>
                    <CardDescription className="text-xs mt-1">{c.description}</CardDescription>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      Weight: {c.weight}%
                    </Badge>
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      Max: {c.max_score} pts
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/40 p-3.5 rounded-xl border border-border/50">
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-foreground">Score Awarded:</label>
                    <Input
                      type="number"
                      min="0"
                      max={c.max_score}
                      step="0.5"
                      value={scores[c.id] ?? ""}
                      disabled={isReadOnly}
                      onChange={(e) =>
                        handleScoreChange(c.id, parseFloat(e.target.value) || 0, c.max_score)
                      }
                      className="w-24 text-center font-mono font-bold text-base h-9"
                    />
                    <span className="text-xs text-muted-foreground font-mono">/ {c.max_score}</span>
                  </div>

                  <div className="text-xs text-right font-mono">
                    <span className="text-muted-foreground">Weighted Contribution: </span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {formatScore(weightedContribution)} pts
                    </strong>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Action Buttons */}
      {!isReadOnly && (
        <div className="flex justify-between items-center pt-4 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveDraft}
            isLoading={isSaving}
            className="gap-1.5"
          >
            <Save className="h-4 w-4" />
            Save Draft
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleSubmitFinal}
            isLoading={isSubmitting}
            disabled={!allScored}
            className="gap-1.5 font-semibold"
          >
            <Send className="h-4 w-4" />
            Submit Final Evaluation
          </Button>
        </div>
      )}
    </div>
  );
}
