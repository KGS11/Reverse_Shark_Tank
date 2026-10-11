import { requireRole, getCurrentJudge } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/ui/navbar";
import Link from "next/link";
import { Award, ClipboardCheck, History } from "lucide-react";

export default async function JudgeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole(["judge"]);
  const judge = await getCurrentJudge();
  const supabase = await createClient();

  const { data: event } = await supabase.from("events").select("name, stage").limit(1).single();

  const currentStage = event?.stage || "SETUP";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar
        user={{
          role: "judge",
          displayName: judge.display_name,
        }}
        stage={currentStage}
      />

      <div className="flex-1 flex flex-col">
        {/* Judge Sub-navigation banner */}
        <div className="border-b border-border bg-card/50 px-4 sm:px-6 lg:px-8 py-3">
          <div className="mx-auto max-w-7xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded flex items-center gap-1">
                <Award className="h-3.5 w-3.5" />
                Evaluator Panel
              </span>
              <span className="font-semibold text-foreground text-sm">{judge.display_name}</span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <Link
                href="/judge"
                className="px-3 py-1.5 rounded-lg font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
              >
                <ClipboardCheck className="h-3.5 w-3.5" />
                Evaluation Board
              </Link>
              <Link
                href="/judge/history"
                className="px-3 py-1.5 rounded-lg font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
              >
                <History className="h-3.5 w-3.5" />
                History & Drafts
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
