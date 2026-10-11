"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DollarSign, AlertTriangle, ArrowUpDown, History, ShieldAlert } from "lucide-react";
import { formatPoints } from "@/lib/utils";

interface TeamInvestmentSummary {
  team_id: string;
  team_no: number;
  name: string;
  points_received: number;
  points_allocated: number;
  remaining_balance: number;
}

interface InvestmentEvent {
  id: string;
  investor_name: string;
  target_name: string;
  old_amount: number;
  new_amount: number;
  action: string;
  reason: string | null;
  created_at: string;
}

export function InvestmentsMonitor({
  stage,
  initialBalance,
  teamSummaries,
  events,
}: {
  stage: string;
  initialBalance: number;
  teamSummaries: TeamInvestmentSummary[];
  events: InvestmentEvent[];
}) {
  const [activeTab, setActiveTab] = React.useState<"summary" | "history">("summary");

  const totalPointsInvested = teamSummaries.reduce((sum, t) => sum + t.points_allocated, 0);
  const highestPointsReceived = Math.max(0, ...teamSummaries.map((t) => t.points_received));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Live Investment Monitoring
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Real-time audit view of all virtual allocations, balances, and transaction history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={stage === "INVESTMENT_OPEN" ? "deal" : "outline"} className="text-xs">
            Round: {stage.replace("_", " ")}
          </Badge>
        </div>
      </div>

      {/* Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">Total Points Invested</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-foreground">
              {formatPoints(totalPointsInvested)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Budget: {formatPoints(initialBalance)} per team
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">Highest Points Received</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {formatPoints(highestPointsReceived)} pts
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Benchmark for 100% Investment Score
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">Confidentiality Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              Strictly Enforced
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Teams and judges cannot see investor identities
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border text-xs font-semibold">
        <button
          onClick={() => setActiveTab("summary")}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === "summary"
              ? "border-ieee-600 text-ieee-600 dark:text-ieee-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Team Allocation & Received Summary
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === "history"
              ? "border-ieee-600 text-ieee-600 dark:text-ieee-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Immutable Event History ({events.length})
        </button>
      </div>

      {/* Summary Table */}
      {activeTab === "summary" && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-center">#</th>
                    <th className="px-4 py-3">Team Name</th>
                    <th className="px-4 py-3 text-right">Points Received</th>
                    <th className="px-4 py-3 text-right">Points Allocated</th>
                    <th className="px-4 py-3 text-right">Remaining Balance</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {teamSummaries.map((team) => (
                    <tr key={team.team_id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3 text-center font-mono font-bold">{team.team_no}</td>
                      <td className="px-4 py-3 font-semibold text-foreground">{team.name}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                        {formatPoints(team.points_received)} pts
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {formatPoints(team.points_allocated)} pts
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {formatPoints(team.remaining_balance)} pts
                      </td>
                      <td className="px-4 py-3 text-center">
                        {team.points_allocated === 0 ? (
                          <Badge variant="destructive" className="text-[10px]">
                            0 Points Invested
                          </Badge>
                        ) : team.remaining_balance === 0 ? (
                          <Badge variant="success" className="text-[10px]">
                            100% Deployed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            Active
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History Table */}
      {activeTab === "history" && (
        <Card>
          <CardContent className="p-0">
            {events.length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                No investment activity recorded in this round yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Investor Team</th>
                      <th className="px-4 py-3">Target Team</th>
                      <th className="px-4 py-3 text-right">Old Amount</th>
                      <th className="px-4 py-3 text-right">New Amount</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-mono">
                    {events.map((ev) => (
                      <tr key={ev.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(ev.created_at).toLocaleTimeString()}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground font-sans">
                          {ev.investor_name}
                        </td>
                        <td className="px-4 py-3 text-foreground font-sans">{ev.target_name}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {ev.old_amount}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-amber-600 dark:text-amber-400">
                          {ev.new_amount}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="uppercase text-[10px] bg-muted px-2 py-0.5 rounded font-mono font-bold">
                            {ev.action}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
