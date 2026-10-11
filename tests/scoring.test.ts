import { describe, it, expect } from "vitest";
import {
  calculateJudgeNormalizedScore,
  validateWeights,
  calculateLeaderboard,
  roundHalfUp,
  Criterion,
  TeamScoreInput,
} from "../lib/scoring";

describe("Scoring Engine: roundHalfUp", () => {
  it("correctly rounds half-up on standard and floating edge cases", () => {
    expect(roundHalfUp(85.124)).toBe(85.12);
    expect(roundHalfUp(85.125)).toBe(85.13); // x.xx5 rounds up
    expect(roundHalfUp(85.126)).toBe(85.13);
    expect(roundHalfUp(1.005)).toBe(1.01);
    expect(roundHalfUp(0)).toBe(0);
  });
});

describe("Scoring Engine: calculateJudgeNormalizedScore", () => {
  const criteria: Criterion[] = [
    { id: "c1", name: "Problem Analysis", maxScore: 10, weight: 20 },
    { id: "c2", name: "Recovery Strategy", maxScore: 10, weight: 20 },
    { id: "c3", name: "Feasibility", maxScore: 10, weight: 20 },
    { id: "c4", name: "Financial Reasoning", maxScore: 10, weight: 20 },
    { id: "c5", name: "Presentation & Q&A", maxScore: 10, weight: 20 },
  ];

  it("normalizes a perfect score to 100", () => {
    const scores = [
      { criterionId: "c1", score: 10 },
      { criterionId: "c2", score: 10 },
      { criterionId: "c3", score: 10 },
      { criterionId: "c4", score: 10 },
      { criterionId: "c5", score: 10 },
    ];
    expect(calculateJudgeNormalizedScore(scores, criteria)).toBe(100.0);
  });

  it("normalizes a varied score properly", () => {
    const scores = [
      { criterionId: "c1", score: 8 }, // 8/10 * 20 = 16
      { criterionId: "c2", score: 9 }, // 9/10 * 20 = 18
      { criterionId: "c3", score: 7 }, // 7/10 * 20 = 14
      { criterionId: "c4", score: 6 }, // 6/10 * 20 = 12
      { criterionId: "c5", score: 8.5 }, // 8.5/10 * 20 = 17
    ];
    // Total = 16 + 18 + 14 + 12 + 17 = 77
    expect(calculateJudgeNormalizedScore(scores, criteria)).toBe(77.0);
  });
});

describe("Scoring Engine: validateWeights", () => {
  it("accepts weights summing to 100", () => {
    const res = validateWeights({ weightJudge: 60, weightInvest: 40 });
    expect(res.normalizedJudge).toBe(0.6);
    expect(res.normalizedInvest).toBe(0.4);
  });

  it("accepts fractional weights summing to 1.0", () => {
    const res = validateWeights({ weightJudge: 0.7, weightInvest: 0.3 });
    expect(res.normalizedJudge).toBe(0.7);
    expect(res.normalizedInvest).toBe(0.3);
  });

  it("throws when weights do not sum to 100", () => {
    expect(() => validateWeights({ weightJudge: 60, weightInvest: 30 })).toThrow(
      /must sum to exactly 100%/
    );
    expect(() => validateWeights({ weightJudge: 50, weightInvest: 60 })).toThrow(
      /must sum to exactly 100%/
    );
  });
});

describe("Scoring Engine: calculateLeaderboard", () => {
  it("handles normal competition case with multiple teams", () => {
    const teams: TeamScoreInput[] = [
      {
        teamId: "team-a",
        teamName: "Alpha Phoenix",
        pointsReceived: 800,
        submittedJudgeScores: [85, 90], // Average = 87.5
      },
      {
        teamId: "team-b",
        teamName: "Beta Resilience",
        pointsReceived: 1000, // Highest points received
        submittedJudgeScores: [80, 80], // Average = 80.0
      },
      {
        teamId: "team-c",
        teamName: "Gamma Turnaround",
        pointsReceived: 400,
        submittedJudgeScores: [70, 75], // Average = 72.5
      },
    ];

    // Highest points = 1000
    // Alpha: Judge = 87.5 * 0.60 = 52.5. Invest = (800/1000)*100 = 80 * 0.40 = 32. Final = 84.5
    // Beta:  Judge = 80.0 * 0.60 = 48.0. Invest = (1000/1000)*100 = 100 * 0.40 = 40. Final = 88.0
    // Gamma: Judge = 72.5 * 0.60 = 43.5. Invest = (400/1000)*100 = 40 * 0.40 = 16. Final = 59.5

    const leaderboard = calculateLeaderboard(teams, { weightJudge: 60, weightInvest: 40 });

    expect(leaderboard).toHaveLength(3);
    // Rank 1: Beta
    expect(leaderboard[0].teamId).toBe("team-b");
    expect(leaderboard[0].rank).toBe(1);
    expect(leaderboard[0].finalScore).toBe(88.0);
    expect(leaderboard[0].investmentScore).toBe(100.0);

    // Rank 2: Alpha
    expect(leaderboard[1].teamId).toBe("team-a");
    expect(leaderboard[1].rank).toBe(2);
    expect(leaderboard[1].finalScore).toBe(84.5);
    expect(leaderboard[1].investmentScore).toBe(80.0);

    // Rank 3: Gamma
    expect(leaderboard[2].teamId).toBe("team-c");
    expect(leaderboard[2].rank).toBe(3);
    expect(leaderboard[2].finalScore).toBe(59.5);
    expect(leaderboard[2].investmentScore).toBe(40.0);
  });

  it("handles all-zero investments without division by zero", () => {
    const teams: TeamScoreInput[] = [
      {
        teamId: "team-1",
        teamName: "Team One",
        pointsReceived: 0,
        submittedJudgeScores: [90],
      },
      {
        teamId: "team-2",
        teamName: "Team Two",
        pointsReceived: 0,
        submittedJudgeScores: [80],
      },
    ];

    const leaderboard = calculateLeaderboard(teams);
    expect(leaderboard[0].investmentScore).toBe(0);
    expect(leaderboard[1].investmentScore).toBe(0);
    // Final score = Judge * 0.6 + 0
    expect(leaderboard[0].finalScore).toBe(54.0); // 90 * 0.6
    expect(leaderboard[1].finalScore).toBe(48.0); // 80 * 0.6
  });

  it("handles a single team competition", () => {
    const teams: TeamScoreInput[] = [
      {
        teamId: "solo",
        teamName: "Solo Team",
        pointsReceived: 500,
        submittedJudgeScores: [95],
      },
    ];

    const leaderboard = calculateLeaderboard(teams);
    expect(leaderboard).toHaveLength(1);
    expect(leaderboard[0].rank).toBe(1);
    expect(leaderboard[0].investmentScore).toBe(100.0); // Highest is 500, so 500/500 * 100 = 100
    expect(leaderboard[0].finalScore).toBe(97.0); // 95 * 0.6 + 100 * 0.4 = 57 + 40 = 97
  });

  it("never treats missing evaluations as zero", () => {
    const teams: TeamScoreInput[] = [
      {
        teamId: "team-full",
        teamName: "Team Full",
        pointsReceived: 500,
        submittedJudgeScores: [80, 80], // Avg = 80
      },
      {
        teamId: "team-partial",
        teamName: "Team Partial",
        pointsReceived: 500,
        // Judge 2 was waived, only Judge 1 submitted an 80
        submittedJudgeScores: [80], // Avg must be 80, NOT 40!
      },
    ];

    const leaderboard = calculateLeaderboard(teams);
    expect(leaderboard[0].avgJudgeScore).toBe(80.0);
    expect(leaderboard[1].avgJudgeScore).toBe(80.0);
    expect(leaderboard[0].finalScore).toBe(leaderboard[1].finalScore);
  });

  it("enforces deterministic tie-breaks in strict priority order", () => {
    const teams: TeamScoreInput[] = [
      // Tied on Final Score, Avg Judge, and Points Received -> Alphabetical tie-break!
      {
        teamId: "id-z",
        teamName: "Zeta Team",
        pointsReceived: 500,
        submittedJudgeScores: [80],
      },
      {
        teamId: "id-a",
        teamName: "Apex Team",
        pointsReceived: 500,
        submittedJudgeScores: [80],
      },
    ];

    const leaderboard = calculateLeaderboard(teams);
    // Apex should come first deterministically
    expect(leaderboard[0].teamName).toBe("Apex Team");
    expect(leaderboard[1].teamName).toBe("Zeta Team");
    // Both share displayed rank 1 because criteria 1-3 are tied
    expect(leaderboard[0].rank).toBe(1);
    expect(leaderboard[1].rank).toBe(1);
  });

  it("breaks tie by Average Judge Score when Final Score is identical", () => {
    // 50/50 weights, highest points = 100 (from Benchmark Team)
    // Team HighJudge: Judge 90, Invest (10/100 * 100 = 10) -> Final = 45 + 5 = 50.0. Judge = 90
    // Team LowJudge:  Judge 50, Invest (50/100 * 100 = 50) -> Final = 25 + 25 = 50.0. Judge = 50
    const teams: TeamScoreInput[] = [
      {
        teamId: "team-benchmark",
        teamName: "Benchmark Team",
        pointsReceived: 100,
        submittedJudgeScores: [80], // Final = 40 + 50 = 90
      },
      {
        teamId: "team-low-judge",
        teamName: "Low Judge High Invest",
        pointsReceived: 50,
        submittedJudgeScores: [50],
      },
      {
        teamId: "team-high-judge",
        teamName: "High Judge Low Invest",
        pointsReceived: 10,
        submittedJudgeScores: [90],
      },
    ];

    const leaderboard = calculateLeaderboard(teams, { weightJudge: 50, weightInvest: 50 });
    // Benchmark is rank 1 (final score 90)
    expect(leaderboard[0].teamId).toBe("team-benchmark");
    expect(leaderboard[0].rank).toBe(1);

    // High Judge has identical final score (50.0) to Low Judge, but higher judge score (90 vs 50)
    expect(leaderboard[1].teamId).toBe("team-high-judge");
    expect(leaderboard[1].finalScore).toBe(50.0);
    expect(leaderboard[1].rank).toBe(2);

    expect(leaderboard[2].teamId).toBe("team-low-judge");
    expect(leaderboard[2].finalScore).toBe(50.0);
    expect(leaderboard[2].rank).toBe(3);
  });

  it("honors changed admin weights correctly", () => {
    const teams: TeamScoreInput[] = [
      {
        teamId: "team-x",
        teamName: "Team X",
        pointsReceived: 1000,
        submittedJudgeScores: [100],
      },
    ];

    // Change to 80% Judge, 20% Invest
    const lb1 = calculateLeaderboard(teams, { weightJudge: 80, weightInvest: 20 });
    expect(lb1[0].finalScore).toBe(100.0); // 100 * 0.8 + 100 * 0.2 = 100.0

    // Change to 50% Judge, 50% Invest
    const lb2 = calculateLeaderboard(teams, { weightJudge: 50, weightInvest: 50 });
    expect(lb2[0].finalScore).toBe(100.0);
  });
});
