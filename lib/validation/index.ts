import { z } from "zod";

export const STAGES = [
  "SETUP",
  "PRESENTATIONS",
  "INVESTMENT_OPEN",
  "INVESTMENT_CLOSED",
  "JUDGING_CLOSED",
  "VERIFICATION",
  "PUBLISHED",
] as const;

export type EventStage = (typeof STAGES)[number];

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export const changePasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long.")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
      .regex(/[0-9]/, "Password must contain at least one digit."),
    confirmPassword: z.string().min(1, "Please confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const eventSettingsSchema = z
  .object({
    name: z.string().min(3, "Event name must be at least 3 characters."),
    initial_balance: z.number().int().positive("Initial balance must be a positive integer."),
    weight_judge: z.number().min(0).max(100, "Judge weight must be between 0 and 100."),
    weight_invest: z.number().min(0).max(100, "Investment weight must be between 0 and 100."),
    reveal_received_totals: z.boolean().default(false),
  })
  .refine(
    (data) => Math.abs(data.weight_judge + data.weight_invest - 100) < 0.001,
    {
      message: "Judge weight and Investment weight must sum to exactly 100%.",
      path: ["weight_invest"],
    }
  );

export const stageTransitionSchema = z.object({
  targetStage: z.enum(STAGES),
  reason: z.string().optional(),
});

export const createTeamSchema = z.object({
  team_no: z.number().int().positive("Team number must be a positive integer."),
  name: z.string().min(2, "Team name must be at least 2 characters."),
  failed_company: z.string().min(2, "Failed company name is required."),
  pitch_summary: z.string().min(10, "Pitch summary must be at least 10 characters."),
  email: z.string().email("Valid team login email is required."),
  presentation_order: z.number().int().positive().default(1),
});

export const createJudgeSchema = z.object({
  display_name: z.string().min(2, "Judge display name is required."),
  email: z.string().email("Valid judge email is required."),
});

export const criterionSchema = z.object({
  name: z.string().min(2, "Criterion name is required."),
  description: z.string().default(""),
  max_score: z.number().positive("Maximum score must be positive.").default(10),
  weight: z.number().min(0).max(100, "Weight must be between 0 and 100."),
  sort_order: z.number().int().default(1),
});

export const setInvestmentSchema = z.object({
  target_team_id: z.string().uuid("Invalid target team ID."),
  amount: z.number().int().positive("Investment amount must be a positive integer."),
});

export const evaluationScoreInputSchema = z.object({
  criterion_id: z.string().uuid("Invalid criterion ID."),
  score: z.number().min(0, "Score cannot be negative."),
});

export const saveEvaluationDraftSchema = z.object({
  evaluation_id: z.string().uuid("Invalid evaluation ID."),
  scores: z.array(evaluationScoreInputSchema),
});

export const submitEvaluationSchema = z.object({
  evaluation_id: z.string().uuid("Invalid evaluation ID."),
});

export const reopenEvaluationSchema = z.object({
  evaluation_id: z.string().uuid("Invalid evaluation ID."),
  reason: z.string().min(5, "A descriptive reason (min 5 characters) is required to reopen an evaluation."),
});

export const waiveEvaluationSchema = z.object({
  judge_id: z.string().uuid("Invalid judge ID."),
  team_id: z.string().uuid("Invalid team ID."),
  reason: z.string().min(5, "A descriptive reason (min 5 characters) is required to waive an evaluation."),
});
