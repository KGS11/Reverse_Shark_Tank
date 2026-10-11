import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency or virtual investment points with standard delimiters.
 */
export function formatPoints(points: number): string {
  return new Intl.NumberFormat("en-IN").format(points);
}

/**
 * Format floating score values to 2 decimal places.
 */
export function formatScore(score: number): string {
  return Number(score).toFixed(2);
}
