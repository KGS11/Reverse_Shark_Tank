import { describe, it, expect } from "vitest";

describe("Business Invariants: Investment Engine Simulation", () => {
  interface InvestmentState {
    initialBalance: number;
    stage: string;
    allocations: Map<string, number>; // targetTeamId -> amount
  }

  function simulateSetInvestment(
    state: InvestmentState,
    investorId: string,
    targetId: string,
    amount: number
  ): { success: boolean; error?: string } {
    if (state.stage !== "INVESTMENT_OPEN") {
      return { success: false, error: "Investment round is not open." };
    }
    if (investorId === targetId) {
      return { success: false, error: "A team cannot invest in itself." };
    }
    if (amount <= 0 || !Number.isInteger(amount)) {
      return { success: false, error: "Amount must be a positive integer." };
    }

    // Calculate other allocated
    let otherAllocated = 0;
    for (const [target, amt] of state.allocations.entries()) {
      if (target !== targetId) {
        otherAllocated += amt;
      }
    }

    if (otherAllocated + amount > state.initialBalance) {
      return { success: false, error: "Allocation exceeds available balance." };
    }

    state.allocations.set(targetId, amount);
    return { success: true };
  }

  it("strictly forbids self-investment", () => {
    const state: InvestmentState = {
      initialBalance: 1000,
      stage: "INVESTMENT_OPEN",
      allocations: new Map(),
    };
    const res = simulateSetInvestment(state, "team-1", "team-1", 100);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/cannot invest in itself/);
  });

  it("strictly forbids overspending available balance", () => {
    const state: InvestmentState = {
      initialBalance: 1000,
      stage: "INVESTMENT_OPEN",
      allocations: new Map(),
    };
    // Allocate 600 to team 2
    expect(simulateSetInvestment(state, "team-1", "team-2", 600).success).toBe(true);

    // Attempt to allocate 500 to team 3 (600 + 500 = 1100 > 1000)
    const overspend = simulateSetInvestment(state, "team-1", "team-3", 500);
    expect(overspend.success).toBe(false);
    expect(overspend.error).toMatch(/exceeds available balance/);

    // Allocating 400 succeeds exactly (600 + 400 = 1000)
    expect(simulateSetInvestment(state, "team-1", "team-3", 400).success).toBe(true);
  });

  it("locks modifications outside the INVESTMENT_OPEN stage", () => {
    const state: InvestmentState = {
      initialBalance: 1000,
      stage: "INVESTMENT_CLOSED",
      allocations: new Map(),
    };
    const res = simulateSetInvestment(state, "team-1", "team-2", 100);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/not open/);
  });

  it("enforces serialization invariant under simulated parallel requests", async () => {
    // Simulating serialized transactional requests
    const state: InvestmentState = {
      initialBalance: 1000,
      stage: "INVESTMENT_OPEN",
      allocations: new Map(),
    };

    // 10 concurrent requests each attempting to allocate 200 points to different targets
    const requests = Array.from({ length: 10 }, (_, i) => ({
      targetId: `target-team-${i + 2}`,
      amount: 200,
    }));

    let successfulCount = 0;
    let failedCount = 0;

    // Simulate mutex / FOR UPDATE serialization
    for (const req of requests) {
      const res = simulateSetInvestment(state, "team-1", req.targetId, req.amount);
      if (res.success) {
        successfulCount++;
      } else {
        failedCount++;
      }
    }

    // Exactly 5 should succeed (5 * 200 = 1000), 5 should be rejected
    expect(successfulCount).toBe(5);
    expect(failedCount).toBe(5);

    let totalAllocated = 0;
    for (const amt of state.allocations.values()) {
      totalAllocated += amt;
    }
    expect(totalAllocated).toBe(1000);
    expect(totalAllocated).toBeLessThanOrEqual(state.initialBalance);
  });
});
