"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, ShieldAlert, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");
  const errorParam = searchParams.get("error");

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(errorParam);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        // Generic error message to prevent user enumeration
        setErrorMessage("Invalid email or password. Please try again.");
        setLoading(false);
        return;
      }

      if (!data.user) {
        setErrorMessage("Authentication failed.");
        setLoading(false);
        return;
      }

      // Check profile role and forced password change
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("role, must_change_password, is_active")
        .eq("id", data.user.id)
        .single();

      if (profileErr || !profile || !profile.is_active) {
        await supabase.auth.signOut();
        setErrorMessage("Your account is not active or not provisioned for this competition.");
        setLoading(false);
        return;
      }

      toast.success("Signed in successfully!");

      if (profile.must_change_password) {
        router.push("/change-password");
        router.refresh();
        return;
      }

      if (redirectTo && redirectTo.startsWith(`/${profile.role}`)) {
        router.push(redirectTo);
      } else {
        router.push(`/${profile.role}`);
      }
      router.refresh();
    } catch {
      setErrorMessage("An unexpected network error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <Card className="border-border shadow-xl backdrop-blur-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Sign in to your account</CardTitle>
        <CardDescription>
          Enter the credentials provisioned by the event committee.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {errorMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20 animate-in fade-in">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              Email Address
            </label>
            <Input
              type="email"
              autoComplete="email"
              placeholder="e.g. team1@vvce.ieee.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              Password
            </label>
            <Input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full mt-2 font-semibold"
            isLoading={loading}
          >
            Sign In
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center justify-center border-t border-border/50 pt-4 pb-4">
        <p className="text-xs text-muted-foreground text-center">
          No public self-registration. Credentials are provided to registered participants by IEEE CS VVCE.
        </p>
      </CardFooter>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-gradient-to-b from-background via-ieee-50/20 to-background dark:via-ieee-950/20">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-ieee-600 to-ieee-800 text-white shadow-xl shadow-ieee-900/20 mb-3">
            <TrendingUp className="h-7 w-7 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Reverse Shark Tank
          </h1>
          <p className="text-xs font-semibold text-ieee-600 dark:text-ieee-400 mt-0.5">
            IEEE Computer Society – VVCE Student Branch
          </p>
          <p className="text-xs text-muted-foreground mt-2 max-w-xs">
            Official portal for competition administrators, evaluating judges, and participating teams.
          </p>
        </div>

        <React.Suspense fallback={<div className="h-64 rounded-xl bg-card border border-border animate-pulse" />}>
          <LoginForm />
        </React.Suspense>

        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            ← Back to Event Landing Page
          </a>
        </div>
      </div>
    </div>
  );
}
