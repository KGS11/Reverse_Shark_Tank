/**
 * DIGITAL REVERSE SHARK TANK - SCORING ENGINE
 * Pure TypeScript Module (Zero I/O)
 * IEEE Computer Society – VVCE Student Branch
 */

export interface Criterion {
  id: string;
  name: string;
  maxScore: number;
  weight: number; // e.g. 20 (percent)
}

export interface JudgeScoreInput {
  criterionId: string;
  score: number;
}

export interface JudgeEvaluation {
  judgeId: string;
  teamId: string;
  status: "draft" | "submitted";
  scores: JudgeScoreInput[];
}

export interface TeamScoreInput {
  teamId: string;
  teamName: string;
  pointsReceived: number;
  submittedJudgeScores: number[]; // Each on 0-100 normalized scale
}

export interface TeamScoreResult {
  teamId: string;
  teamName: string;
  avgJudgeScore: number; // Stored/displayed rounded to 2 decimals
  rawAvgJudgeScore: number;
  pointsReceived: number;
  investmentScore: number; // Stored/displayed rounded to 2 decimals
  rawInvestmentScore: number;
  finalScore: number; // Stored/displayed rounded to 2 decimals
  rawFinalScore: number;
  rank: number; // Display rank (shared if criteria 1-3 tied)
}

export interface ScoringWeights {
  weightJudge: number; // e.g. 60 or 0.60
  weightInvest: number; // e.g. 40 or 0.40
}

/**
 * Standard Round-Half-Up to 2 decimal places.
 * Ensures consistent behavior across JS floating point arithmetic.
 */
/**
 * Standard Round-Half-Up to specified decimal places.
 * Uses exponential notation to avoid IEEE-754 binary floating point representation issues.
 */
export function roundHalfUp(value: number, decimals: number = 2): number {
  if (isNaN(value) || !isFinite(value)) return 0;
  // Convert to exponential representation to shift decimal point safely
  const parts = `${value}`.split("e");
  const shifted = Math.round(
    Number(`${parts[0]}e${parts[1] ? Number(parts[1]) + decimals : decimals}`)
  );
  const shiftedParts = `${shifted}`.split("e");
  return Number(
    `${shiftedParts[0]}e${shiftedParts[1] ? Number(shiftedParts[1]) - decimals : -decimals}`
  );
}

/**
 * Normalizes a single judge's evaluation to a 0-100 scale:
 * sum over criteria of (criterion_score / criterion_max * criterion_weight)
 */
export function calculateJudgeNormalizedScore(
  scores: JudgeScoreInput[],
  criteria: Criterion[]
): number {
  if (!scores || scores.length === 0 || !criteria || criteria.length === 0) {
    return 0;
  }

  const scoreMap = new Map<string, number>();
  for (const s of scores) {
    scoreMap.set(s.criterionId, s.score);
  }

  let totalNormalized = 0;
  for (const crit of criteria) {
    const rawScore = scoreMap.get(crit.id) ?? 0;
    if (crit.maxScore <= 0) {
      throw new Error(`Criterion maxScore must be greater than 0: ${crit.name}`);
    }
    const ratio = rawScore / crit.maxScore;
    totalNormalized += ratio * crit.weight;
  }

  return roundHalfUp(totalNormalized, 2);
}

/**
 * Validates that weights sum to exactly 100% (allowing tolerance for decimals).
 */
export function validateWeights(weights: ScoringWeights): {
  normalizedJudge: number;
  normalizedInvest: number;
} {
  let wJudge = weights.weightJudge;
  let wInvest = weights.weightInvest;

  // Support either 0.60/0.40 or 60/40
  if (wJudge <= 1 && wInvest <= 1 && (wJudge > 0 || wInvest > 0)) {
    wJudge = wJudge * 100;
    wInvest = wInvest * 100;
  }

  const total = roundHalfUp(wJudge + wInvest, 2);
  if (Math.abs(total - 100.0) > 0.001) {
    throw new Error(
      `Scoring weights must sum to exactly 100%. Provided: Judge=${weights.weightJudge}, Invest=${weights.weightInvest} (sum=${total}%)`
    );
  }

  return {
    normalizedJudge: wJudge / 100,
    normalizedInvest: wInvest / 100,
  };
}

/**
 * Computes final scores and deterministic ranking for all teams.
 *
 * Rules:
 * 1. Investment Score = (Points Received / Highest Points Received) * 100
 *    If highest = 0, Investment Score is 0 for all teams.
 * 2. Final Score = (Average Judge Score * W_judge) + (Investment Score * W_invest)
 * 3. Incomplete evaluations are NEVER treated as zero. Only submitted judge scores are averaged.
 * 4. Deterministic tie-breaks in order:
 *    (1) higher Final Score
 *    (2) higher Average Judge Score
 *    (3) higher Points Received
 *    (4) team name alphabetical, case-insensitive
 *    (5) team ID
 * 5. Teams share a displayed rank ONLY if tied on criteria 1-3.
 */
export function calculateLeaderboard(
  teams: TeamScoreInput[],
  weights: ScoringWeights = { weightJudge: 60, weightInvest: 40 }
): TeamScoreResult[] {
  if (!teams || teams.length === 0) {
    return [];
  }

  const { normalizedJudge, normalizedInvest } = validateWeights(weights);

  // 1. Highest Points Received
  let highestPoints = 0;
  for (const t of teams) {
    if (t.pointsReceived > highestPoints) {
      highestPoints = t.pointsReceived;
    }
  }

  // 2. Compute raw scores
  const intermediate = teams.map((team) => {
    // Average Judge Score: ONLY over submitted evaluations!
    let rawAvgJudge = 0;
    if (team.submittedJudgeScores.length > 0) {
      const sum = team.submittedJudgeScores.reduce((acc, s) => acc + s, 0);
      rawAvgJudge = sum / team.submittedJudgeScores.length;
    }

    // Investment Score
    let rawInvest = 0;
    if (highestPoints > 0) {
      rawInvest = (team.pointsReceived / highestPoints) * 100;
    }

    // Final Score: exact calculation
    const rawFinal = rawAvgJudge * normalizedJudge + rawInvest * normalizedInvest;

    return {
      teamId: team.teamId,
      teamName: team.teamName,
      rawAvgJudgeScore: rawAvgJudge,
      displayAvgJudge: roundHalfUp(rawAvgJudge, 2),
      pointsReceived: team.pointsReceived,
      rawInvestmentScore: rawInvest,
      displayInvest: roundHalfUp(rawInvest, 2),
      rawFinalScore: rawFinal,
      displayFinal: roundHalfUp(rawFinal, 2),
    };
  });

  // 3. Sort deterministically on unrounded values:
  // (1) higher Final Score
  // (2) higher Average Judge Score
  // (3) higher Points Received
  // (4) team name alphabetical (case-insensitive)
  // (5) team ID
  intermediate.sort((a, b) => {
    if (Math.abs(b.rawFinalScore - a.rawFinalScore) > 1e-9) {
      return b.rawFinalScore - a.rawFinalScore;
    }
    if (Math.abs(b.rawAvgJudgeScore - a.rawAvgJudgeScore) > 1e-9) {
      return b.rawAvgJudgeScore - a.rawAvgJudgeScore;
    }
    if (b.pointsReceived !== a.pointsReceived) {
      return b.pointsReceived - a.pointsReceived;
    }
    const nameCompare = a.teamName.localeCompare(b.teamName, undefined, {
      sensitivity: "base",
    });
    if (nameCompare !== 0) {
      return nameCompare;
    }
    return a.teamId.localeCompare(b.teamId);
  });

  // 4. Assign ranks (shared if criteria 1-3 match on displayed values)
  const results: TeamScoreResult[] = [];
  let displayRank = 1;

  for (let i = 0; i < intermediate.length; i++) {
    const curr = intermediate[i];
    if (i === 0) {
      displayRank = 1;
    } else {
      const prev = intermediate[i - 1];
      const isTied =
        curr.displayFinal === prev.displayFinal &&
        curr.displayAvgJudge === prev.displayAvgJudge &&
        curr.pointsReceived === prev.pointsReceived;

      if (!isTied) {
        displayRank = i + 1;
      }
    }

    results.push({
      teamId: curr.teamId,
      teamName: curr.teamName,
      avgJudgeScore: curr.displayAvgJudge,
      rawAvgJudgeScore: curr.rawAvgJudgeScore,
      pointsReceived: curr.pointsReceived,
      investmentScore: curr.displayInvest,
      rawInvestmentScore: curr.rawInvestmentScore,
      finalScore: curr.displayFinal,
      rawFinalScore: curr.rawFinalScore,
      rank: displayRank,
    });
  }

  return results;
}
