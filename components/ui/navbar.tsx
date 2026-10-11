"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/lib/../components/ui/badge";
import { Button } from "@/lib/../components/ui/button";
import {
  TrendingUp,
  Award,
  Layers,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  UserCheck,
  Briefcase,
  ExternalLink,
} from "lucide-react";

interface NavbarProps {
  user?: {
    email?: string;
    role: "admin" | "judge" | "team";
    displayName: string;
  } | null;
  stage?: string;
}

export function Navbar({ user, stage }: NavbarProps) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      setIsLoggingOut(false);
    }
  };

  const getRoleIcon = () => {
    if (user?.role === "admin") return <ShieldCheck className="h-4 w-4 text-amber-500" />;
    if (user?.role === "judge") return <Award className="h-4 w-4 text-emerald-500" />;
    return <Briefcase className="h-4 w-4 text-blue-500" />;
  };

  const getStageVariant = (st?: string) => {
    if (st === "INVESTMENT_OPEN") return "deal";
    if (st === "PUBLISHED") return "success";
    return "stage";
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand identity */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-ieee-600 to-ieee-800 text-white shadow-md shadow-ieee-900/20 group-hover:scale-105 transition-transform">
              <TrendingUp className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-foreground text-base sm:text-lg">
                  Reverse Shark Tank
                </span>
                <span className="hidden sm:inline-block text-xs font-semibold px-1.5 py-0.5 rounded bg-ieee-100 text-ieee-800 dark:bg-ieee-900 dark:text-ieee-200">
                  VVCE
                </span>
              </div>
              <p className="text-[11px] font-medium text-muted-foreground hidden sm:block">
                IEEE Computer Society Student Branch
              </p>
            </div>
          </Link>

          {/* Live Stage Badge */}
          {stage && (
            <div className="hidden md:flex items-center gap-1.5 pl-4 border-l border-border">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <Badge variant={getStageVariant(stage)}>
                {stage.replace("_", " ")}
              </Badge>
            </div>
          )}
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              {/* Role-specific quick nav */}
              {user.role === "admin" && (
                <div className="flex items-center gap-2 mr-2">
                  <Link href="/admin">
                    <Button variant="ghost" size="sm">Dashboard</Button>
                  </Link>
                  <Link href="/admin/investments">
                    <Button variant="ghost" size="sm">Investments</Button>
                  </Link>
                  <Link href="/admin/evaluations">
                    <Button variant="ghost" size="sm">Evaluations</Button>
                  </Link>
                  <Link href="/admin/results">
                    <Button variant="ghost" size="sm">Results</Button>
                  </Link>
                </div>
              )}

              {user.role === "judge" && (
                <div className="flex items-center gap-2 mr-2">
                  <Link href="/judge">
                    <Button variant="ghost" size="sm">Teams</Button>
                  </Link>
                  <Link href="/judge/history">
                    <Button variant="ghost" size="sm">Evaluation History</Button>
                  </Link>
                </div>
              )}

              {user.role === "team" && (
                <div className="flex items-center gap-2 mr-2">
                  <Link href="/team">
                    <Button variant="ghost" size="sm">Dashboard</Button>
                  </Link>
                  <Link href="/team/invest">
                    <Button variant="deal" size="sm">Browse & Invest</Button>
                  </Link>
                </div>
              )}

              {/* User badge */}
              <div className="flex items-center gap-2 pl-3 border-l border-border">
                <div className="flex items-center gap-1.5 text-xs font-medium text-foreground bg-muted/60 px-2.5 py-1.5 rounded-lg border border-border/50">
                  {getRoleIcon()}
                  <span>{user.displayName}</span>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground px-1 py-0.2 rounded bg-background">
                    {user.role}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  isLoading={isLoggingOut}
                  title="Sign out"
                  className="h-8 px-2.5"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button size="sm" variant="default" className="font-semibold">
                  Sign In
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu trigger */}
        <div className="flex md:hidden items-center gap-2">
          {stage && (
            <Badge variant={getStageVariant(stage)} className="text-[10px] px-2 py-0.5">
              {stage.replace("_", " ")}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-card p-4 space-y-3 animate-in slide-in-from-top-4">
          {user ? (
            <>
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  {getRoleIcon()}
                  <div>
                    <div className="text-sm font-semibold">{user.displayName}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </div>
                </div>
                <Badge variant="outline" className="uppercase font-mono text-[10px]">
                  {user.role}
                </Badge>
              </div>

              <div className="space-y-1">
                {user.role === "admin" && (
                  <>
                    <Link href="/admin" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start text-sm">Dashboard</Button>
                    </Link>
                    <Link href="/admin/investments" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start text-sm">Investments</Button>
                    </Link>
                    <Link href="/admin/evaluations" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start text-sm">Evaluations</Button>
                    </Link>
                    <Link href="/admin/results" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start text-sm">Results</Button>
                    </Link>
                  </>
                )}

                {user.role === "judge" && (
                  <>
                    <Link href="/judge" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start text-sm">Teams to Evaluate</Button>
                    </Link>
                    <Link href="/judge/history" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start text-sm">Evaluation History</Button>
                    </Link>
                  </>
                )}

                {user.role === "team" && (
                  <>
                    <Link href="/team" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start text-sm">Dashboard</Button>
                    </Link>
                    <Link href="/team/invest" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="deal" className="w-full justify-start text-sm">Browse & Invest</Button>
                    </Link>
                  </>
                )}
              </div>

              <div className="pt-2 border-t border-border">
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleLogout}
                  isLoading={isLoggingOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </>
          ) : (
            <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
              <Button className="w-full" variant="default">Sign In</Button>
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
