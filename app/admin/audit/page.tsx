import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  await requireRole(["admin"]);
  const admin = createAdminClient();

  const { data: logs } = await admin
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(150);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          System Audit Logs
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Immutable event log tracking administrative stage overrides, waivers, evaluations, and exports.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {!logs || logs.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No audit records generated yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Entity</th>
                    <th className="px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono text-[11px]">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap font-sans">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        <Badge variant="outline" className="text-[10px]">
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{log.entity}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-md truncate">
                        {JSON.stringify(log.details)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
