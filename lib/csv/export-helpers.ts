import Papa from "papaparse";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Neutralizes Excel formula injection characters: =, +, -, @, \t, \r
 */
export function sanitizeCellValue(val: any): any {
  if (val === null || val === undefined) return "";
  if (typeof val === "number" || typeof val === "boolean") return val;

  const str = String(val);
  const trimmed = str.trim();
  if (/^[=+\-@\t\r]/.test(str) || /^[=+\-@\t\r]/.test(trimmed)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Sanitizes an array of objects for Excel-safe CSV export
 */
export function sanitizeDataForCSV(rows: Record<string, any>[]): Record<string, any>[] {
  return rows.map((row) => {
    const sanitizedRow: Record<string, any> = {};
    for (const [key, val] of Object.entries(row)) {
      sanitizedRow[key] = sanitizeCellValue(val);
    }
    return sanitizedRow;
  });
}

/**
 * Converts array of objects to CSV with UTF-8 BOM and formula neutralization
 */
export function generateSafeCSV(data: Record<string, any>[]): string {
  const sanitized = sanitizeDataForCSV(data);
  const csv = Papa.unparse(sanitized);
  // Prepend UTF-8 BOM (\uFEFF) for Excel compatibility
  return `\uFEFF${csv}`;
}

/**
 * Records CSV export in immutable audit log
 */
export async function logCSVExport(actorId: string, exportType: string, rowCount: number) {
  try {
    const admin = createAdminClient();
    await admin.from("audit_logs").insert({
      actor_id: actorId,
      action: "CSV_EXPORT",
      entity: "reports",
      entity_id: exportType,
      details: {
        export_type: exportType,
        rows_exported: rowCount,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("Failed to log CSV export to audit log:", err);
  }
}
