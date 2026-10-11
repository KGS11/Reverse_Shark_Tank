import { describe, it, expect } from "vitest";
import { sanitizeCellValue, generateSafeCSV } from "../lib/csv/export-helpers";

describe("CSV Export Helpers: Formula Injection Protection", () => {
  it("sanitizes dangerous spreadsheet formulas starting with =, +, -, @", () => {
    expect(sanitizeCellValue("=1+1")).toBe("'=1+1");
    expect(sanitizeCellValue("-cmd|' /C calc'!A0")).toBe("'-cmd|' /C calc'!A0");
    expect(sanitizeCellValue("+SUM(A1:B2)")).toBe("'+SUM(A1:B2)");
    expect(sanitizeCellValue("@SUM(A1:B2)")).toBe("'@SUM(A1:B2)");
    expect(sanitizeCellValue("\tmalicious_tab")).toBe("'\tmalicious_tab");
  });

  it("leaves standard alphanumeric strings and numbers untouched", () => {
    expect(sanitizeCellValue("Team Phoenix")).toBe("Team Phoenix");
    expect(sanitizeCellValue(100)).toBe(100);
    expect(sanitizeCellValue(85.5)).toBe(85.5);
    expect(sanitizeCellValue("")).toBe("");
  });

  it("prepends UTF-8 BOM for Excel compatibility in generated CSV", () => {
    const data = [{ team: "=Danger", points: 100 }];
    const csv = generateSafeCSV(data);
    expect(csv.charCodeAt(0)).toBe(0xfeff); // Check BOM
    expect(csv).toContain("team,points");
    expect(csv).toContain("'=Danger");
  });
});
