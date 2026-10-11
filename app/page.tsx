import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Navbar } from "@/components/ui/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  TrendingUp,
  Award,
  Users,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Trophy,
  BarChart3,
  Search,
  CheckCircle2,
} from "lucide-react";
import { formatPoints, formatScore } from "@/lib/utils";

interface PublishedResultRow {
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
    pitch_summary: string;
  };
}

export const revalidate = 10; // Refresh public page every 10 seconds

export default async function HomePage() {
  const supabase = await createClient();

  // Get current session if user is logged in
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  let userProfile = null;
  if (authUser) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, display_name")
      .eq("id", authUser.id)
      .single();
    if (profile) {
      userProfile = {
        email: authUser.email,
        role: profile.role,
        displayName: profile.display_name,
      };
    }
  }

  // Get Event details
  const { data: eventData } = await supabase
    .from("events")
    .select("name, stage, weight_judge, weight_invest")
    .limit(1)
    .single();

  const currentStage = eventData?.stage || "SETUP";
  const isPublished = currentStage === "PUBLISHED";

  // If published, fetch published leaderboard snapshot
  let publishedResults: PublishedResultRow[] = [];
  let publishedWeights = { judge: 60, invest: 40 };

  if (isPublished) {
    const { data: snapshot } = await supabase
      .from("results_snapshots")
      .select("id, weight_judge, weight_invest")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(1)
      .single();

    if (snapshot) {
      publishedWeights = {
        judge: Number(snapshot.weight_judge),
        invest: Number(snapshot.weight_invest),
      };

      const { data: rows } = await supabase
        .from("result_rows")
        .select(`
          rank,
          team_id,
          avg_judge_score,
          points_received,
          investment_score,
          final_score,
          team:teams (
            team_no,
            name,
            failed_company,
            pitch_summary
          )
        `)
        .eq("snapshot_id", snapshot.id)
        .order("rank", { ascending: true })
        .order("final_score", { ascending: false });

      if (rows) {
        publishedResults = rows as unknown as PublishedResultRow[];
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-ieee-500 selection:text-white">
      <Navbar user={userProfile} stage={currentStage} />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-ieee-950 via-ieee-900 to-background text-white pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.12),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(0,98,155,0.2),transparent_50%)]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-ieee-400/30 bg-ieee-800/60 px-3.5 py-1 text-xs font-semibold text-ieee-200 backdrop-blur-md mb-6">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            IEEE Computer Society – VVCE Student Branch
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
            Digital Reverse <br />
            <span className="bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500 bg-clip-text text-transparent">
              Shark Tank
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-slate-300 font-normal leading-relaxed">
            The ultimate startup turnaround championship. Participating teams deconstruct real-world failed companies, pitch recovery masterplans, and virtually invest live capital into peer strategies.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {userProfile ? (
              <Link href={`/${userProfile.role}`}>
                <Button size="lg" variant="deal" className="gap-2">
                  Enter Your {userProfile.role.toUpperCase()} Portal
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button size="lg" variant="deal" className="gap-2">
                  Participant & Judge Sign In
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            )}

            <a href="#how-it-works">
              <Button size="lg" variant="outline" className="border-slate-700 bg-slate-900/60 text-white hover:bg-slate-800">
                How It Works
              </Button>
            </a>
          </div>

          {/* Live Stage Tracker Header */}
          <div className="mt-12 inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur-md">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
              Live Competition Stage:
            </span>
            <Badge variant="deal" className="text-xs font-mono font-bold tracking-wide">
              {currentStage.replace("_", " ")}
            </Badge>
          </div>
        </div>
      </section>

      {/* Published Official Leaderboard Section */}
      {isPublished && (
        <section id="leaderboard" className="py-16 sm:py-24 bg-card border-b border-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-3">
                <Trophy className="h-3.5 w-3.5" />
                Official Final Standings Published
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Competition Leaderboard
              </h2>
              <p className="mt-2 text-sm text-muted-foreground max-w-2xl mx-auto">
                Official verified scores calculated per authoritative formula: Judges ({publishedWeights.judge}%) + Investment ({publishedWeights.invest}%).
              </p>
            </div>

            {publishedResults.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No published result rows found.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border shadow-xl bg-background">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/70 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-4 py-3.5 text-center">Rank</th>
                      <th className="px-4 py-3.5">Team & Case Study</th>
                      <th className="px-4 py-3.5 text-right">Judge Avg (0-100)</th>
                      <th className="px-4 py-3.5 text-right">Points Received</th>
                      <th className="px-4 py-3.5 text-right">Invest Score</th>
                      <th className="px-4 py-3.5 text-right font-bold text-foreground">Final Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-medium">
                    {publishedResults.map((row, idx) => {
                      const isTop3 = row.rank <= 3;
                      return (
                        <tr
                          key={row.team_id}
                          className={`hover:bg-muted/40 transition-colors ${
                            row.rank === 1 ? "bg-amber-500/5 font-semibold" : ""
                          }`}
                        >
                          <td className="px-4 py-4 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                                row.rank === 1
                                  ? "bg-amber-400 text-amber-950 shadow-md shadow-amber-400/20"
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
                          <td className="px-4 py-4">
                            <div className="font-semibold text-foreground text-base">
                              {row.team?.name || `Team ${row.team?.team_no}`}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                              <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px]">
                                #{row.team?.team_no}
                              </span>
                              <span>Failed Case: <strong className="text-foreground">{row.team?.failed_company}</strong></span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right whitespace-nowrap font-mono">
                            {formatScore(row.avg_judge_score)}
                          </td>
                          <td className="px-4 py-4 text-right whitespace-nowrap font-mono text-amber-600 dark:text-amber-400">
                            {formatPoints(row.points_received)} pts
                          </td>
                          <td className="px-4 py-4 text-right whitespace-nowrap font-mono">
                            {formatScore(row.investment_score)}
                          </td>
                          <td className="px-4 py-4 text-right whitespace-nowrap font-mono text-base font-bold text-ieee-600 dark:text-ieee-400">
                            {formatScore(row.final_score)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-6 rounded-xl bg-muted/40 p-4 border border-border text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Deterministic Ranking Rules:</p>
              <p>
                Ties are resolved in strict sequence: (1) higher Final Score, (2) higher Average Judge Score, (3) higher Total Points Received, (4) team name alphabetical, and (5) team ID.
                Teams share a displayed rank only if tied on criteria 1–3.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              How Reverse Shark Tank Works
            </h2>
            <p className="mt-3 text-sm text-muted-foreground max-w-2xl mx-auto">
              A 4-stage competitive format engineered by IEEE Computer Society VVCE to test business acumen, critical diagnosis, and investment strategy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ieee-100 text-ieee-800 dark:bg-ieee-900 dark:text-ieee-200 mb-2 font-bold text-sm">
                  01
                </div>
                <CardTitle className="text-lg">Case Autopsy</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground leading-relaxed">
                Teams dissect historical startup failures (Theranos, WeWork, Byju&apos;s, FTX, etc.) to uncover root causes and fatal strategic blindspots.
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ieee-100 text-ieee-800 dark:bg-ieee-900 dark:text-ieee-200 mb-2 font-bold text-sm">
                  02
                </div>
                <CardTitle className="text-lg">Pitch Recovery Plan</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground leading-relaxed">
                Teams present a realistic, executable turnaround roadmap to the judging panel and peer competitors under strict time limits.
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm hover:shadow-md transition-shadow border-amber-500/30 bg-amber-500/[0.02]">
              <CardHeader className="pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-2 font-bold text-sm">
                  03
                </div>
                <CardTitle className="text-lg">Peer Angel Investing</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground leading-relaxed">
                Each team gets a fixed budget of virtual points (1,000 pts) to invest in peer teams based on presentation merit. Confidentiality is enforced.
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ieee-100 text-ieee-800 dark:bg-ieee-900 dark:text-ieee-200 mb-2 font-bold text-sm">
                  04
                </div>
                <CardTitle className="text-lg">Private Judging & Scoring</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground leading-relaxed">
                Independent judges evaluate teams across 5 standardized criteria. Final scores synthesize Judge evaluations (60%) and Investment capture (40%).
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border bg-muted/30 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">Digital Reverse Shark Tank</span>
            <span>•</span>
            <span>IEEE Computer Society – VVCE Student Branch</span>
          </div>
          <div>
            Vidyavardhaka College of Engineering, Mysuru
          </div>
        </div>
      </footer>
    </div>
  );
}
