import { describe, expect, it } from "vitest";

import {
  calculateAttachRate,
  calculateTechnicalWinArr,
  calculateTechnicalWinToWonCohort,
  calculateTechWinRate,
  getTechWinCohortPredicate,
  isTechnicalWinOrLater,
  isWon,
  selectArr,
} from "@/data";
import { FIXTURE_OPPORTUNITIES } from "@/fixtures";

describe("ARR and metric definitions", () => {
  it("selects only the explicitly requested ARR field and never substitutes", () => {
    const missingDealSize = FIXTURE_OPPORTUNITIES.find(
      ({ id }) => id === "006UKI000000014",
    )!;

    expect(selectArr(missingDealSize, "dealSize")).toEqual({
      amount: null,
      basis: "dealSize",
      usedFallback: false,
    });
    expect(selectArr(missingDealSize, "netBuArr").amount).toBe(72_000);
  });

  it("calculates SE attach by count and dollars for a configurable scope", () => {
    const metric = calculateAttachRate(
      FIXTURE_OPPORTUNITIES,
      "won",
      "netBuArr",
    );

    expect(metric.scope).toBe("won");
    expect(metric.denominator).toEqual({ count: 7, amount: 888_000 });
    expect(metric.numerator).toEqual({ count: 5, amount: 686_000 });
    expect(metric.countRate).toBeCloseTo(5 / 7);
    expect(metric.amountRate).toBeCloseTo(686 / 888);
  });

  it("returns null rates, not a misleading zero, for an empty scope", () => {
    const metric = calculateAttachRate([], "all", "netBuArr");
    expect(metric.countRate).toBeNull();
    expect(metric.amountRate).toBeNull();
  });

  it("sums Technical Win or later using configurable stage ordering", () => {
    expect(calculateTechnicalWinArr(FIXTURE_OPPORTUNITIES, "netBuArr")).toEqual(
      { count: 9, amount: 1_458_000, arrBasis: "netBuArr" },
    );

    expect(
      isTechnicalWinOrLater(
        { presalesStage: "Commercial Review" },
        {
          stageOrder: [
            "Technical Validation",
            "Technical Win",
            "Commercial Review",
          ],
        },
      ),
    ).toBe(true);
  });

  it("keeps Tech Win Rate numerator and denominator independently configurable", () => {
    const metric = calculateTechWinRate(FIXTURE_OPPORTUNITIES, {
      numeratorPredicate: (opportunity) => isTechnicalWinOrLater(opportunity),
      denominatorPredicate: isWon,
      arrBasis: "netBuArr",
    });

    expect(metric.numerator).toEqual({ count: 9, amount: 1_458_000 });
    expect(metric.denominator).toEqual({ count: 7, amount: 888_000 });
    expect(metric.amountRate).toBeCloseTo(1_458 / 888);
  });

  it("resolves every store cohort ID to a pure predicate", () => {
    const allClosed = FIXTURE_OPPORTUNITIES.filter(
      getTechWinCohortPredicate("all-closed"),
    );
    const open = FIXTURE_OPPORTUNITIES.filter(
      getTechWinCohortPredicate("open-pipeline"),
    );
    const engaged = FIXTURE_OPPORTUNITIES.filter(
      getTechWinCohortPredicate("presales-engaged"),
    );
    expect(allClosed).toHaveLength(10);
    expect(open).toHaveLength(6);
    expect(engaged).toHaveLength(16);
    expect(
      FIXTURE_OPPORTUNITIES.filter(
        getTechWinCohortPredicate("all-opportunities"),
      ),
    ).toHaveLength(16);
  });

  it("uses technical-win date for the cohort and ignores close-quarter timing", () => {
    const metric = calculateTechnicalWinToWonCohort(FIXTURE_OPPORTUNITIES, {
      cohortPeriod: { start: "2026-02-01", end: "2026-02-28" },
      arrBasis: "netBuArr",
    });

    // Crown Health later won in April; Falcon Insurance later lost in May.
    expect(metric.cohortOpportunityIds).toEqual([
      "006UKI000000003",
      "006UKI000000006",
    ]);
    expect(metric.convertedOpportunityIds).toEqual(["006UKI000000003"]);
    expect(metric.denominator).toEqual({ count: 2, amount: 340_000 });
    expect(metric.numerator).toEqual({ count: 1, amount: 130_000 });
    expect(metric.countRate).toBe(0.5);
  });
});
