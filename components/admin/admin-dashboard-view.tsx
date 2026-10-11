"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  TrendingUp,
  Award,
  Users,
  DollarSign,
  ClipboardCheck,
  PlayCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { setEventStage } from "@/app/admin/actions";
import { STAGES, EventStage } from "@/lib/validation";
import { formatPoints } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface AdminDashboardViewProps {
  event: {
    id: string;
    name: string;
    stage: string;
    initial_balance: number;
    weight_judge: number;
    weight_invest: number;
    reveal_received_totals: boolean;
  };
  metrics: {
    totalTeams: number;
    activeTeams: number;
    totalJudges: number;
    presentationsCompleted: number;
    totalInvestedPoints: number;
    totalExpectedInvestment: number;
    totalEvaluationsSubmitted: number;
    totalEvaluationsExpected: number;
  };
  teamInvestmentsData: Array<{
    name: string;
    points: number;
  }>;
  recentEvents: Array<{
    id: string;
    investor_name: string;
    target_name: string;
    amount: number;
    action: string;
    created_at: string;
  }>;
  zeroInvestmentTeams: string[];
}

export function AdminDashboardView({
  event,
  metrics,
  teamInvestmentsData,
  recentEvents,
  zeroInvestmentTeams,
}: AdminDashboardViewProps) {
  const [stageModalOpen, setStageModalOpen] = React.useState(false);
  const [targetStage, setTargetStage] = React.useState<EventStage>(event.stage as EventStage);
  const [backwardReason, setBackwardReason] = React.useState("");
  const [isUpdatingStage, setIsUpdatingStage] = React.useState(false);

  const currentStageIndex = STAGES.indexOf(event.stage as EventStage);
  const targetStageIndex = STAGES.indexOf(targetStage);
  const isBackward = targetStageIndex < currentStageIndex;

  const handleStageChange = async () => {
    if (isBackward && backwardReason.trim().length < 5) {
      toast.error("Please provide a descriptive reason (at least 5 characters) for moving back a stage.");
      return;
    }

    setIsUpdatingStage(true);
    try {
      await setEventStage(targetStage, backwardReason);
      toast.success(`Event stage transitioned to ${targetStage}!`);
      setStageModalOpen(false);
      setBackwardReason("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update stage");
    } finally {
      setIsUpdatingStage(false);
    }
  };

  const getNextStage = (): EventStage | null => {
    if (currentStageIndex < STAGES.length - 1) {
      return STAGES[currentStageIndex + 1];
    }
    return null;
  };

  const nextStage = getNextStage();

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Header & Stage Controller */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Event Control Center
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time live monitoring and stage orchestration for IEEE CS VVCE Reverse Shark Tank.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-card border border-border px-3.5 py-2 rounded-xl shadow-sm">
            <span className="text-xs text-muted-foreground font-semibold">STAGE:</span>
            <Badge variant="deal" className="font-mono text-xs">
              {event.stage.replace("_", " ")}
            </Badge>
          </div>

          <Button
            variant="default"
            size="sm"
            onClick={() => {
              if (nextStage) setTargetStage(nextStage);
              setStageModalOpen(true);
            }}
            disabled={event.stage === "PUBLISHED"}
            className="font-semibold shadow-sm"
          >
            Advance Stage
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Teams Metric */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Teams Registered</CardTitle>
            <Users className="h-4 w-4 text-ieee-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{metrics.totalTeams}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.activeTeams} active • {metrics.presentationsCompleted} completed pitches
            </p>
          </CardContent>
        </Card>

        {/* Judges Metric */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Judges</CardTitle>
            <Award className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{metrics.totalJudges}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Independent evaluation panel
            </p>
          </CardContent>
        </Card>

        {/* Investment Metric */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Investments Allocated</CardTitle>
            <DollarSign className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground font-mono">
              {formatPoints(metrics.totalInvestedPoints)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              of {formatPoints(metrics.totalExpectedInvestment)} pool ({metrics.totalExpectedInvestment > 0 ? Math.round((metrics.totalInvestedPoints / metrics.totalExpectedInvestment) * 100) : 0}%)
            </p>
          </CardContent>
        </Card>

        {/* Evaluations Metric */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Evaluations Submitted</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {metrics.totalEvaluationsSubmitted} / {metrics.totalEvaluationsExpected}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.totalEvaluationsExpected > 0 ? Math.round((metrics.totalEvaluationsSubmitted / metrics.totalEvaluationsExpected) * 100) : 0}% completion rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Anomaly Alerts */}
      {event.stage === "INVESTMENT_OPEN" && zeroInvestmentTeams.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3 text-amber-900 dark:text-amber-200">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <div className="font-semibold">Investment Participation Alert</div>
            <div>
              {zeroInvestmentTeams.length} team(s) have not yet placed any investments:{" "}
              <strong>{zeroInvestmentTeams.join(", ")}</strong>. Remind them before the round closes!
            </div>
          </div>
        </div>
      )}

      {/* Charts & Live Feed Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recharts Bar: Investment Per Team */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Points Received Per Team</CardTitle>
            <CardDescription>Live distribution of virtual investment capital across teams</CardDescription>
          </CardHeader>
          <CardContent>
            {teamInvestmentsData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                No investment data recorded yet.
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={teamInvestmentsData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: number) => [`${val} points`, "Received"]}
                      contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#fff", borderRadius: "8px", fontSize: "12px" }}
                    />
                    <Bar dataKey="points" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Investment Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Live Activity Feed</CardTitle>
            <CardDescription>Immutable transaction event stream</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {recentEvents.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No recent activity recorded.
              </div>
            ) : (
              <div className="divide-y divide-border max-h-80 overflow-y-auto">
                {recentEvents.map((ev) => (
                  <div key={ev.id} className="p-3 text-xs space-y-1 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center justify-between font-medium">
                      <span className="text-foreground font-semibold">{ev.investor_name}</span>
                      <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                        {ev.amount} pts
                      </span>
                    </div>
                    <div className="text-muted-foreground flex items-center justify-between text-[11px]">
                      <span>Invested in {ev.target_name}</span>
                      <span className="uppercase text-[10px] bg-muted px-1.5 py-0.2 rounded font-mono">
                        {ev.action}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stage Transition Dialog */}
      <Dialog
        isOpen={stageModalOpen}
        onClose={() => setStageModalOpen(false)}
        title="Transition Event Stage"
        description="Advance the competition workflow or roll back to an earlier stage."
      >
        <div className="space-y-4 text-sm">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Select New Target Stage</label>
            <select
              value={targetStage}
              onChange={(e) => setTargetStage(e.target.value as EventStage)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {STAGES.map((st) => (
                <option key={st} value={st}>
                  {st} {st === event.stage ? "(Current)" : ""}
                </option>
              ))}
            </select>
          </div>

          {isBackward && (
            <div className="space-y-1.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-red-500">
                <RotateCcw className="h-3.5 w-3.5" />
                Backward Stage Transition
              </div>
              <p className="text-xs text-muted-foreground">
                Moving backwards requires an audited justification logged permanently for IEEE records.
              </p>
              <Input
                placeholder="Reason for rolling back stage (min 5 chars)..."
                value={backwardReason}
                onChange={(e) => setBackwardReason(e.target.value)}
                className="mt-2 text-xs"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setStageModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={isBackward ? "destructive" : "deal"}
              size="sm"
              onClick={handleStageChange}
              isLoading={isUpdatingStage}
            >
              Confirm Stage Transition
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
