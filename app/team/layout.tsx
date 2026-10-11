import { requireRole, getCurrentTeam } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/ui/navbar";
import Link from "next/link";
import { Briefcase, DollarSign, LayoutDashboard, History } from "lucide-react";

export default async function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole(["team"]);
  const team = await getCurrentTeam();
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("name, stage, reveal_received_totals")
    .limit(1)
    .single();

  const currentStage = event?.stage || "SETUP";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar
        user={{
          role: "team",
          displayName: team.name,
        }}
        stage={currentStage}
      />

      <div className="flex-1 flex flex-col">
        {/* Team Sub-nav banner */}
        <div className="border-b border-border bg-card/50 px-4 sm:px-6 lg:px-8 py-3">
          <div className="mx-auto max-w-7xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs font-bold bg-ieee-100 dark:bg-ieee-900 text-ieee-800 dark:text-ieee-200 px-2 py-0.5 rounded">
                Team #{team.team_no}
              </span>
              <span className="font-semibold text-foreground text-sm">{team.name}</span>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                • Case Study: <strong className="text-foreground">{team.failed_company}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <Link
                href="/team"
                className="px-3 py-1.5 rounded-lg font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/team/invest"
                className="px-3 py-1.5 rounded-lg font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
              >
                Browse & Invest
              </Link>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 mx-auto max-w-7xl w-full p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
