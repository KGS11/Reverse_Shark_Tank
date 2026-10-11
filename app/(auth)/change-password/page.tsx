"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, ShieldAlert, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { changePasswordSchema } from "@/lib/validation";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const validation = changePasswordSchema.safeParse({ password, confirmPassword });
    if (!validation.success) {
      setErrorMessage(validation.error.errors[0]?.message || "Invalid password.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // 1. Update password in Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({
        password: password,
      });

      if (authError) {
        setErrorMessage(authError.message);
        setLoading(false);
        return;
      }

      // 2. Clear must_change_password in profile
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .update({ must_change_password: false, updated_at: new Date().toISOString() })
        .eq("id", user.id)
        .select("role")
        .single();

      if (profileErr) {
        setErrorMessage("Password updated, but failed to update profile state.");
        setLoading(false);
        return;
      }

      toast.success("Password changed successfully! Welcome to the event.");
      router.push(`/${profile.role}`);
      router.refresh();
    } catch {
      setErrorMessage("An unexpected error occurred while updating your password.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-background">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 mb-3">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            First-Time Login Security
          </h1>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            For event security, you must replace your temporary access password before entering your dashboard.
          </p>
        </div>

        <Card className="border-border shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg">Set New Password</CardTitle>
            <CardDescription>
              Choose a strong personal password (min 8 chars, 1 uppercase, 1 digit).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {errorMessage && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  New Password
                </label>
                <Input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  Confirm New Password
                </label>
                <Input
                  type="password"
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-ieee-600" />
                  Password Requirements:
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] pl-1">
                  <li>At least 8 characters long</li>
                  <li>At least one uppercase letter (A-Z)</li>
                  <li>At least one numerical digit (0-9)</li>
                </ul>
              </div>

              <Button
                type="submit"
                variant="deal"
                className="w-full mt-2 font-semibold"
                isLoading={loading}
              >
                Save Password & Continue
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
