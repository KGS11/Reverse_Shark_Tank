"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  KeyRound,
  Search,
  CheckCircle2,
  Clock,
  Play,
  Download,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import {
  createTeamAccount,
  bulkImportTeams,
  updatePresentationStatus,
  resetUserPassword,
} from "@/app/admin/actions";

interface TeamItem {
  id: string;
  profile_id: string;
  team_no: number;
  name: string;
  failed_company: string;
  pitch_summary: string;
  presentation_order: number;
  presentation_status: "Pending" | "Presenting" | "Completed";
  is_active: boolean;
  profile?: {
    must_change_password: boolean;
  };
}

export function TeamsManager({ initialTeams }: { initialTeams: TeamItem[] }) {
  const [teams, setTeams] = React.useState<TeamItem[]>(initialTeams);
  const [search, setSearch] = React.useState("");

  // Add Single Team Modal State
  const [addModalOpen, setAddModalOpen] = React.useState(false);
  const [teamNo, setTeamNo] = React.useState("");
  const [name, setName] = React.useState("");
  const [failedCompany, setFailedCompany] = React.useState("");
  const [pitchSummary, setPitchSummary] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [presOrder, setPresOrder] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Bulk CSV Modal State
  const [csvModalOpen, setCsvModalOpen] = React.useState(false);
  const [csvRawText, setCsvRawText] = React.useState("");
  const [isImporting, setIsImporting] = React.useState(false);

  // Credentials Display Modal State (shows temporary passwords generated)
  const [credentialsModalOpen, setCredentialsModalOpen] = React.useState(false);
  const [generatedCredentials, setGeneratedCredentials] = React.useState<
    Array<{ team: string; email: string; tempPassword: string }>
  >([]);

  const filteredTeams = teams.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.failed_company.toLowerCase().includes(search.toLowerCase()) ||
      String(t.team_no).includes(search)
  );

  const handleCreateSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await createTeamAccount({
        team_no: Number(teamNo),
        name,
        failed_company: failedCompany,
        pitch_summary: pitchSummary,
        email,
        presentation_order: Number(presOrder || teamNo),
      });

      toast.success(`Team "${name}" created successfully!`);
      setTeams((prev) => [...prev, res.team]);
      setAddModalOpen(false);

      // Show temporary password modal
      setGeneratedCredentials([
        {
          team: name,
          email: res.credentials.email,
          tempPassword: res.credentials.tempPassword,
        },
      ]);
      setCredentialsModalOpen(true);

      // Reset form
      setTeamNo("");
      setName("");
      setFailedCompany("");
      setPitchSummary("");
      setEmail("");
      setPresOrder("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create team.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkImport = async () => {
    if (!csvRawText.trim()) {
      toast.error("Please paste CSV contents.");
      return;
    }

    setIsImporting(true);
    try {
      const parsed = Papa.parse(csvRawText.trim(), {
        header: true,
        skipEmptyLines: true,
      });

      if (parsed.errors.length > 0) {
        throw new Error(`CSV format error: ${parsed.errors[0]?.message}`);
      }

      const rows = (parsed.data as any[]).map((r) => ({
        team_no: Number(r.team_no || r.TeamNo || r["Team Number"]),
        name: r.name || r.TeamName || r["Team Name"],
        failed_company: r.failed_company || r.FailedCompany || r["Failed Company"],
        pitch_summary: r.pitch_summary || r.PitchSummary || r["Pitch Summary"] || "",
        email: r.email || r.Email,
        presentation_order: Number(r.presentation_order || r.team_no || 1),
      }));

      const res = await bulkImportTeams(rows);

      if (res.created.length > 0) {
        toast.success(`Successfully imported ${res.created.length} teams!`);
        setCsvModalOpen(false);
        setCsvRawText("");

        // Show credentials modal
        setGeneratedCredentials(
          res.created.map((c) => ({
            team: c.name,
            email: c.email,
            tempPassword: c.tempPassword,
          }))
        );
        setCredentialsModalOpen(true);
      }

      if (res.errors.length > 0) {
        toast.error(`Encountered ${res.errors.length} errors during import.`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to import CSV.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleStatusChange = async (
    teamId: string,
    status: "Pending" | "Presenting" | "Completed"
  ) => {
    try {
      await updatePresentationStatus(teamId, status);
      setTeams((prev) =>
        prev.map((t) => (t.id === teamId ? { ...t, presentation_status: status } : t))
      );
      toast.success(`Presentation status updated to ${status}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const handleResetPassword = async (profileId: string, teamName: string) => {
    try {
      const res = await resetUserPassword(profileId);
      toast.success(`Password reset for ${teamName}!`);
      setGeneratedCredentials([
        {
          team: teamName,
          email: "Active Account",
          tempPassword: res.tempPassword,
        },
      ]);
      setCredentialsModalOpen(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password.");
    }
  };

  const downloadCredentialsCSV = () => {
    const csv = Papa.unparse(generatedCredentials);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `team-credentials-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Teams & Presentation Schedule
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage participating startup recovery teams, pitch order, and credentials.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCsvModalOpen(true)}
            className="gap-1.5"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Bulk CSV Import
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => setAddModalOpen(true)}
            className="gap-1.5"
          >
            <UserPlus className="h-4 w-4" />
            Add Single Team
          </Button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search teams by name, company, or #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>
      </div>

      {/* Teams Table */}
      <Card>
        <CardContent className="p-0">
          {filteredTeams.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No teams registered yet. Use &quot;Add Single Team&quot; or &quot;Bulk CSV Import&quot; above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-center">#</th>
                    <th className="px-4 py-3">Team Name</th>
                    <th className="px-4 py-3">Failed Company Case</th>
                    <th className="px-4 py-3 text-center">Order</th>
                    <th className="px-4 py-3 text-center">Presentation Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTeams.map((team) => (
                    <tr key={team.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3 text-center font-mono font-bold text-foreground">
                        {team.team_no}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {team.name}
                        <div className="text-[11px] text-muted-foreground line-clamp-1 font-normal">
                          {team.pitch_summary}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-amber-600 dark:text-amber-400">
                        {team.failed_company}
                      </td>
                      <td className="px-4 py-3 text-center font-mono">
                        {team.presentation_order}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <select
                          value={team.presentation_status}
                          onChange={(e) =>
                            handleStatusChange(
                              team.id,
                              e.target.value as "Pending" | "Presenting" | "Completed"
                            )
                          }
                          className="rounded-md border border-input bg-background px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Presenting">Presenting</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResetPassword(team.profile_id, team.name)}
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

      {/* Add Single Team Modal */}
      <Dialog
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Provision New Team Account"
        description="Creates Supabase login credentials, team registration, and initial profile."
      >
        <form onSubmit={handleCreateSingle} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-muted-foreground">Team Number (#)</label>
              <Input
                type="number"
                min="1"
                placeholder="1"
                value={teamNo}
                onChange={(e) => setTeamNo(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="font-semibold text-muted-foreground">Presentation Order</label>
              <Input
                type="number"
                min="1"
                placeholder="1"
                value={presOrder}
                onChange={(e) => setPresOrder(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-muted-foreground">Team Name</label>
            <Input
              placeholder="e.g. Turnaround Titans"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="font-semibold text-muted-foreground">Failed Company Analyzed</label>
            <Input
              placeholder="e.g. Theranos, WeWork, Enron"
              value={failedCompany}
              onChange={(e) => setFailedCompany(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="font-semibold text-muted-foreground">Pitch Strategy Summary</label>
            <textarea
              className="w-full rounded-lg border border-input bg-background p-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              rows={3}
              placeholder="Summary of the recovery strategy presented..."
              value={pitchSummary}
              onChange={(e) => setPitchSummary(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="font-semibold text-muted-foreground">Login Email Address</label>
            <Input
              type="email"
              placeholder="team1@vvce.ieee.org"
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
              Provision Team
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Bulk CSV Import Modal */}
      <Dialog
        isOpen={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        title="Bulk Import Teams via CSV"
        description="Paste CSV data containing headers: team_no, name, failed_company, pitch_summary, email"
      >
        <div className="space-y-3 text-xs">
          <div className="rounded-lg bg-muted p-2.5 font-mono text-[11px] text-muted-foreground">
            team_no,name,failed_company,pitch_summary,email<br />
            1,Phoenix Capital,Theranos,Micro-fluidics software pivot,team1@vvce.ieee.org<br />
            2,Resilience Labs,WeWork,Franchise asset-light coworking,team2@vvce.ieee.org
          </div>

          <textarea
            className="w-full rounded-lg border border-input bg-background p-2 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            rows={8}
            placeholder="Paste raw CSV content here..."
            value={csvRawText}
            onChange={(e) => setCsvRawText(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setCsvModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="deal" size="sm" onClick={handleBulkImport} isLoading={isImporting}>
              Import Teams
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Credentials Modal (Temporary Passwords Display) */}
      <Dialog
        isOpen={credentialsModalOpen}
        onClose={() => setCredentialsModalOpen(false)}
        title="Generated Team Credentials"
        description="Share these temporary passwords with participating teams. Users will be forced to set their own password upon first login."
      >
        <div className="space-y-4 text-xs">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-900 dark:text-amber-200">
            <div className="font-semibold flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Important Security Notice
            </div>
            <p className="mt-1">
              Download or copy these credentials now. For security, passwords will not be displayed again in plaintext.
            </p>
          </div>

          <div className="max-h-60 overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-3 py-2">Team</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2 font-mono">Temp Password</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {generatedCredentials.map((c, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 font-semibold text-foreground">{c.team}</td>
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
            <Button variant="outline" size="sm" onClick={downloadCredentialsCSV} className="gap-1.5">
              <Download className="h-4 w-4" />
              Download Credentials CSV
            </Button>
            <Button variant="default" size="sm" onClick={() => setCredentialsModalOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
