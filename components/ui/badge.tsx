import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "deal" | "stage";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "bg-ieee-600 text-white",
    secondary: "bg-secondary text-secondary-foreground",
    destructive: "bg-red-500/10 text-red-500 border border-red-500/20",
    outline: "text-foreground border border-border",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    deal: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-semibold",
    stage: "bg-ieee-50 text-ieee-700 dark:bg-ieee-950 dark:text-ieee-300 border border-ieee-200 dark:border-ieee-800 font-mono text-xs uppercase tracking-wider",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
