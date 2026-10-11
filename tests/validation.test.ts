import { describe, it, expect } from "vitest";
import {
  loginSchema,
  changePasswordSchema,
  eventSettingsSchema,
  createTeamSchema,
  setInvestmentSchema,
  reopenEvaluationSchema,
  waiveEvaluationSchema,
} from "../lib/validation";

describe("Validation Schemas: loginSchema", () => {
  it("validates correct credentials", () => {
    const res = loginSchema.safeParse({
      email: "judge1@vvce.ieee.org",
      password: "SecretPassword123!",
    });
    expect(res.success).toBe(true);
  });

  it("rejects malformed email and blank password", () => {
    const res = loginSchema.safeParse({
      email: "not-an-email",
      password: "",
    });
    expect(res.success).toBe(false);
  });
});

describe("Validation Schemas: changePasswordSchema", () => {
  it("validates strong matching password", () => {
    const res = changePasswordSchema.safeParse({
      password: "StrongPassword2026!",
      confirmPassword: "StrongPassword2026!",
    });
    expect(res.success).toBe(true);
  });

  it("rejects passwords without numbers or uppercase", () => {
    const res = changePasswordSchema.safeParse({
      password: "lowercaseonly",
      confirmPassword: "lowercaseonly",
    });
    expect(res.success).toBe(false);
  });

  it("rejects mismatched passwords", () => {
    const res = changePasswordSchema.safeParse({
      password: "StrongPassword2026!",
      confirmPassword: "DifferentPassword2026!",
    });
    expect(res.success).toBe(false);
  });
});

describe("Validation Schemas: eventSettingsSchema", () => {
  it("accepts valid settings summing to 100%", () => {
    const res = eventSettingsSchema.safeParse({
      name: "Reverse Shark Tank 2026",
      initial_balance: 1000,
      weight_judge: 60,
      weight_invest: 40,
      reveal_received_totals: false,
    });
    expect(res.success).toBe(true);
  });

  it("rejects settings where weights do not sum to 100%", () => {
    const res = eventSettingsSchema.safeParse({
      name: "Reverse Shark Tank 2026",
      initial_balance: 1000,
      weight_judge: 50,
      weight_invest: 40, // Sum = 90
      reveal_received_totals: false,
    });
    expect(res.success).toBe(false);
  });

  it("rejects negative or zero initial balance", () => {
    const res = eventSettingsSchema.safeParse({
      name: "Reverse Shark Tank 2026",
      initial_balance: 0,
      weight_judge: 60,
      weight_invest: 40,
      reveal_received_totals: false,
    });
    expect(res.success).toBe(false);
  });
});

describe("Validation Schemas: createTeamSchema", () => {
  it("validates team registration data", () => {
    const res = createTeamSchema.safeParse({
      team_no: 1,
      name: "Team Theranos Reborn",
      failed_company: "Theranos",
      pitch_summary: "Pivoting from faulty micro-fluidics to decentralized lab diagnostics software.",
      email: "team1@vvce.ieee.org",
      presentation_order: 1,
    });
    expect(res.success).toBe(true);
  });

  it("rejects non-positive team numbers", () => {
    const res = createTeamSchema.safeParse({
      team_no: 0,
      name: "Team Zero",
      failed_company: "Enron",
      pitch_summary: "Accounting transparency turnaround.",
      email: "team0@vvce.ieee.org",
      presentation_order: 1,
    });
    expect(res.success).toBe(false);
  });
});

describe("Validation Schemas: setInvestmentSchema", () => {
  it("validates positive allocation and valid uuid", () => {
    const res = setInvestmentSchema.safeParse({
      target_team_id: "00000000-0000-0000-0000-000000000001",
      amount: 250,
    });
    expect(res.success).toBe(true);
  });

  it("rejects zero or negative allocation", () => {
    const res = setInvestmentSchema.safeParse({
      target_team_id: "00000000-0000-0000-0000-000000000001",
      amount: 0,
    });
    expect(res.success).toBe(false);
  });
});

describe("Validation Schemas: reopenEvaluationSchema & waiveEvaluationSchema", () => {
  it("requires at least 5 characters for documented audit reasons", () => {
    const valid = reopenEvaluationSchema.safeParse({
      evaluation_id: "00000000-0000-0000-0000-000000000001",
      reason: "Judge accidentally tapped submit before finishing Criterion 4.",
    });
    expect(valid.success).toBe(true);

    const invalid = reopenEvaluationSchema.safeParse({
      evaluation_id: "00000000-0000-0000-0000-000000000001",
      reason: "oops", // Less than 5 chars
    });
    expect(invalid.success).toBe(false);
  });
});
