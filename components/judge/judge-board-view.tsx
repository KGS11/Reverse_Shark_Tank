"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Award,
  Search,
  CheckCircle2,
  Clock,
  Lock,
  ArrowRight,
  AlertCircle,
  FileText,
} from "lucide-react";
import { formatScore } from "@/lib/utils";

interface JudgeTeamItem {
  id: string;
  team_no: number;
  name: string;
  failed_company: string;
  pitch_summary: string;
  presentation_order: number;
  presentation_status: "Pending" | "Presenting" | "Completed";
  evaluation_status: "none" | "draft" | "submitted";
  normalized_score?: number | null;
  submitted_at?: string | null;
}

export function JudgeBoardView({
  eventStage,
  teams,
}: {
  eventStage: string;
  teams: JudgeTeamItem[];
}) {
  const isJudgingOpen = eventStage === "PRESENTATIONS" || eventStage === "INVESTMENT_OPEN";
  const [search, setSearch] = React.useState("");

  const filteredTeams = teams.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.failed_company.toLowerCase().includes(search.toLowerCase()) ||
      String(t.team_no).includes(search)
  );

  const submittedCount = teams.filter((t) => t.evaluation_status === "submitted").length;
  const draftCount = teams.filter((t) => t.evaluation_status === "draft").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Status Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Evaluation Board
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Privately score participating teams across the 5 competition dimensions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-card border border-border px-3.5 py-2 rounded-xl text-xs shadow-sm">
            <span className="text-muted-foreground font-semibold">Your Progress:</span>
            <span className="font-mono font-bold text-foreground">
              {submittedCount} / {teams.length} submitted
            </span>
            {draftCount > 0 && (
              <Badge variant="deal" className="text-[10px] ml-1">
                {draftCount} draft
              </Badge>
            )}
          </div>
        </div>
      </div>

      {!isJudgingOpen && (
        <div className="rounded-xl border border-border bg-muted/60 p-4 flex items-center gap-3 text-xs text-muted-foreground">
          <Lock className="h-4 w-4 text-amber-500 shrink-0" />
          <div>
            <strong>Judging Closed:</strong> Current competition stage is <strong>{eventStage}</strong>. Evaluations can only be scored during the <strong>PRESENTATIONS</strong> and <strong>INVESTMENT_OPEN</strong> stages.
          </div>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search teams by name or company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 text-xs"
        />
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTeams.map((t) => {
          const isSubmitted = t.evaluation_status === "submitted";
          const isDraft = t.evaluation_status === "draft";

          return (
            <Card
              key={t.id}
              className={`flex flex-col justify-between border-border transition-all hover:shadow-md ${
                isSubmitted ? "border-emerald-500/30 bg-emerald-500/[0.01]" : ""
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

                  {isSubmitted ? (
                    <Badge variant="success" className="text-[10px] gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Submitted
                    </Badge>
                  ) : isDraft ? (
                    <Badge variant="deal" className="text-[10px] gap-1">
                      <Clock className="h-3 w-3" />
                      Draft
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      Pending
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <CardDescription className="font-medium text-foreground">
                    Case: <strong className="text-amber-600 dark:text-amber-400">{t.failed_company}</strong>
                  </CardDescription>

                  <Badge
                    variant={t.presentation_status === "Completed" ? "success" : "secondary"}
                    className="text-[10px]"
                  >
                    Pitch: {t.presentation_status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                {t.pitch_summary}
              </CardContent>

              <CardFooter className="pt-3 border-t border-border/50 flex items-center justify-between">
                <div>
                  {isSubmitted && t.normalized_score !== undefined && t.normalized_score !== null ? (
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-muted-foreground">
                        Your Score (0-100):
                      </div>
                      <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {formatScore(t.normalized_score)}
                      </div>
                    </div>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">
                      {isDraft ? "Draft in progress" : "Not yet evaluated"}
                    </span>
                  )}
                </div>

                <Link href={`/judge/evaluate/${t.id}`}>
                  <Button
                    variant={isSubmitted ? "outline" : "default"}
                    size="sm"
                    className="text-xs font-semibold gap-1.5"
                  >
                    {isSubmitted ? "View Evaluation" : isDraft ? "Continue Draft" : "Evaluate"}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
