"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ListOrdered, Save, Plus, AlertCircle, Lock } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface CriterionItem {
  id: string;
  name: string;
  description: string;
  max_score: number;
  weight: number;
  sort_order: number;
  is_active: boolean;
}

export function CriteriaManager({
  initialCriteria,
  isLocked,
}: {
  initialCriteria: CriterionItem[];
  isLocked: boolean;
}) {
  const [criteria, setCriteria] = React.useState<CriterionItem[]>(initialCriteria);
  const [isSaving, setIsSaving] = React.useState(false);

  const totalWeight = criteria.reduce((sum, c) => sum + Number(c.weight || 0), 0);
  const isValidWeight = Math.abs(totalWeight - 100) < 0.001;

  const handleUpdate = (index: number, field: keyof CriterionItem, val: any) => {
    if (isLocked) return;
    setCriteria((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleSave = async () => {
    if (isLocked) {
      toast.error("Criteria are locked because evaluation submissions have commenced.");
      return;
    }

    if (!isValidWeight) {
      toast.error(`Weights must sum to exactly 100%. Current sum: ${totalWeight.toFixed(1)}%`);
      return;
    }

    setIsSaving(true);
    const supabase = createClient();
    try {
      for (const crit of criteria) {
        const { error } = await supabase
          .from("criteria")
          .update({
            name: crit.name,
            description: crit.description,
            max_score: Number(crit.max_score),
            weight: Number(crit.weight),
            sort_order: Number(crit.sort_order),
            updated_at: new Date().toISOString(),
          })
          .eq("id", crit.id);

        if (error) throw error;
      }

      toast.success("Criteria updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update criteria");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Evaluation Criteria & Rubric
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Configure the 5 standardized evaluation dimensions and weights used by judges.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-card border border-border px-3 py-1.5 rounded-lg text-xs">
            <span className="text-muted-foreground font-semibold">Total Weight:</span>
            <span
              className={`font-mono font-bold ${
                isValidWeight ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
              }`}
            >
              {totalWeight.toFixed(1)}% / 100%
            </span>
          </div>

          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            isLoading={isSaving}
            disabled={isLocked || !isValidWeight}
            className="gap-1.5 font-semibold"
          >
            <Save className="h-4 w-4" />
            Save Rubric
          </Button>
        </div>
      </div>

      {isLocked && (
        <div className="rounded-xl border border-border bg-muted/60 p-4 flex items-center gap-3 text-xs text-muted-foreground">
          <Lock className="h-4 w-4 text-amber-500 shrink-0" />
          <div>
            <strong>Rubric Locked:</strong> Submissions have already been recorded. Criteria weights cannot be modified unless evaluations are reopened by an administrator.
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-center">#</th>
                  <th className="px-4 py-3">Criterion Name</th>
                  <th className="px-4 py-3">Rubric Description</th>
                  <th className="px-4 py-3 text-center">Max Score</th>
                  <th className="px-4 py-3 text-center">Weight (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {criteria.map((c, i) => (
                  <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 text-center font-mono font-bold">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Input
                        value={c.name}
                        onChange={(e) => handleUpdate(i, "name", e.target.value)}
                        disabled={isLocked}
                        className="text-xs font-semibold h-8"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        value={c.description}
                        onChange={(e) => handleUpdate(i, "description", e.target.value)}
                        disabled={isLocked}
                        className="text-xs h-8 text-muted-foreground"
                      />
                    </td>
                    <td className="px-4 py-3 text-center w-24">
                      <Input
                        type="number"
                        min="1"
                        value={c.max_score}
                        onChange={(e) => handleUpdate(i, "max_score", Number(e.target.value))}
                        disabled={isLocked}
                        className="text-xs text-center font-mono h-8"
                      />
                    </td>
                    <td className="px-4 py-3 text-center w-28">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={c.weight}
                        onChange={(e) => handleUpdate(i, "weight", Number(e.target.value))}
                        disabled={isLocked}
                        className="text-xs text-center font-mono font-bold text-amber-600 dark:text-amber-400 h-8"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
