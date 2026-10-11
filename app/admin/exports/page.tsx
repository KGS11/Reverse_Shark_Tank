import { requireRole } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Download, ShieldCheck, History, Award, DollarSign } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminExportsPage() {
  await requireRole(["admin"]);

  const exports = [
    {
      id: "results",
      title: "Final Competition Results Breakdown",
      desc: "Full ranking, judge average score, points received, investment score, and final scores.",
      icon: Award,
    },
    {
      id: "investments-summary",
      title: "Team Investment Summary",
      desc: "Per-team points received and points allocated across the competition.",
      icon: DollarSign,
    },
    {
      id: "investments-history",
      title: "Complete Investment Transaction Log",
      desc: "Chronological immutable record of every create, update, and remove action.",
      icon: History,
    },
    {
      id: "evaluations",
      title: "Detailed Evaluator Scores",
      desc: "Per-judge, per-team, and per-criterion submitted score breakdown.",
      icon: ShieldCheck,
    },
    {
      id: "audit-log",
      title: "Administrative Audit Trail",
      desc: "Comprehensive security log of stage changes, settings edits, and waivers.",
      icon: FileSpreadsheet,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          CSV Exports & Official Reporting
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Server-generated, UTF-8 BOM formatted, Excel-safe spreadsheets with formula-injection neutralization.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exports.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.id} className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ieee-50 dark:bg-ieee-950 text-ieee-600 dark:text-ieee-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">{item.title}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">{item.desc}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 flex justify-end">
                <a href={`/api/admin/export?type=${item.id}`} download>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
                    <Download className="h-3.5 w-3.5" />
                    Download CSV
                  </Button>
                </a>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
