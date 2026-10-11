import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/ui/navbar";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Award,
  ListOrdered,
  DollarSign,
  ClipboardCheck,
  CheckCircle2,
  FileSpreadsheet,
  History,
  Settings,
} from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole(["admin"]);
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("name, stage")
    .limit(1)
    .single();

  const currentStage = event?.stage || "SETUP";

  const navLinks = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/teams", label: "Teams & Pitches", icon: Users },
    { href: "/admin/judges", label: "Judges & Exclusions", icon: Award },
    { href: "/admin/criteria", label: "Scoring Criteria", icon: ListOrdered },
    { href: "/admin/investments", label: "Investments Live", icon: DollarSign },
    { href: "/admin/evaluations", label: "Evaluations Matrix", icon: ClipboardCheck },
    { href: "/admin/results", label: "Verification & Results", icon: CheckCircle2 },
    { href: "/admin/exports", label: "CSV Exports", icon: FileSpreadsheet },
    { href: "/admin/audit", label: "Audit Logs", icon: History },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar
        user={{
          role: "admin",
          displayName: profile.display_name,
        }}
        stage={currentStage}
      />

      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar for Admin */}
        <aside className="w-full md:w-64 border-r border-border bg-card/60 p-4 space-y-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 mb-2">
              Event Management
            </div>
            <nav className="space-y-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-ieee-600 dark:text-ieee-400" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="rounded-xl border border-border bg-background p-3 text-xs space-y-1.5">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <Settings className="h-3.5 w-3.5 text-amber-500" />
              Event Info
            </div>
            <div className="text-muted-foreground truncate">{event?.name || "Reverse Shark Tank"}</div>
            <div className="text-[11px] text-muted-foreground">
              Stage: <strong className="text-foreground">{currentStage}</strong>
            </div>
          </div>
        </aside>

        {/* Main Admin Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
