"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Award, UserPlus, FileSpreadsheet, KeyRound, Search, Download, AlertCircle, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import { createJudgeAccount, resetUserPassword } from "@/app/admin/actions";

interface JudgeItem {
  id: string;
  profile_id: string;
  display_name: string;
  profile?: {
    is_active: boolean;
  };
  exclusions?: Array<{
    id: string;
    team_id: string;
    reason: string;
    team: { name: string; team_no: number };
  }>;
}

export function JudgesManager({
  initialJudges,
  allTeams,
}: {
  initialJudges: JudgeItem[];
  allTeams: Array<{ id: string; name: string; team_no: number }>;
}) {
  const [judges, setJudges] = React.useState<JudgeItem[]>(initialJudges);
  const [search, setSearch] = React.useState("");

  // Add Single Judge
  const [addModalOpen, setAddModalOpen] = React.useState(false);
  const [displayName, setDisplayName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Credentials Modal
  const [credentialsModalOpen, setCredentialsModalOpen] = React.useState(false);
  const [generatedCredentials, setGeneratedCredentials] = React.useState<
    Array<{ name: string; email: string; tempPassword: string }>
  >([]);

  const filteredJudges = judges.filter((j) =>
    j.display_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await createJudgeAccount({ display_name: displayName, email });
      toast.success(`Judge "${displayName}" provisioned!`);
      setJudges((prev) => [...prev, res.judge]);
      setAddModalOpen(false);

      setGeneratedCredentials([
        {
          name: displayName,
          email: res.credentials.email,
          tempPassword: res.credentials.tempPassword,
        },
      ]);
      setCredentialsModalOpen(true);

      setDisplayName("");
      setEmail("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create judge.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (profileId: string, judgeName: string) => {
    try {
      const res = await resetUserPassword(profileId);
      toast.success(`Password reset for ${judgeName}!`);
      setGeneratedCredentials([
        {
          name: judgeName,
          email: "Active Account",
          tempPassword: res.tempPassword,
        },
      ]);
      setCredentialsModalOpen(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Judges & Evaluation Panel
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Provision independent judging accounts and configure conflict-of-interest exclusions.
          </p>
        </div>

        <Button
          variant="default"
          size="sm"
          onClick={() => setAddModalOpen(true)}
          className="gap-1.5"
        >
          <UserPlus className="h-4 w-4" />
          Add Single Judge
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search judges by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 text-xs"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {filteredJudges.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No judges provisioned yet. Click &quot;Add Single Judge&quot; to provision an evaluator.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-3">Judge Name</th>
                    <th className="px-4 py-3">Conflict Exclusions</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredJudges.map((judge) => (
                    <tr key={judge.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                          <Award className="h-4 w-4 text-emerald-600" />
                          {judge.display_name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {judge.exclusions && judge.exclusions.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {judge.exclusions.map((ex) => (
                              <span
                                key={ex.id}
                                className="bg-muted px-2 py-0.5 rounded text-[11px] font-mono text-foreground"
                              >
                                Excluded: {ex.team?.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">None (evaluates all teams)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResetPassword(judge.profile_id, judge.display_name)}
                          className="h-7 text-xs gap-1"
                        >
                          <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                          Reset Pass
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Single Judge Modal */}
      <Dialog
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Provision Evaluator Account"
        description="Creates private login credentials for an independent judge."
      >
        <form onSubmit={handleCreateSingle} className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-muted-foreground">Judge Full Name</label>
            <Input
              placeholder="e.g. Dr. Rajesh Kumar"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="font-semibold text-muted-foreground">Judge Email</label>
            <Input
              type="email"
              placeholder="e.g. judge1@vvce.ieee.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="outline" size="sm" type="button" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="deal" size="sm" type="submit" isLoading={isSubmitting}>
              Provision Judge
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Credentials Modal */}
      <Dialog
        isOpen={credentialsModalOpen}
        onClose={() => setCredentialsModalOpen(false)}
        title="Judge Access Credentials"
        description="Provide these temporary credentials to the evaluator. They will be forced to change password upon first login."
      >
        <div className="space-y-4 text-xs">
          <div className="max-h-60 overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2 font-mono">Temp Password</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {generatedCredentials.map((c, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 font-semibold text-foreground">{c.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{c.email}</td>
                    <td className="px-3 py-2 font-mono font-bold text-amber-600 dark:text-amber-400">
                      {c.tempPassword}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="default" size="sm" onClick={() => setCredentialsModalOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
