import { describe, expect, it } from "vitest";

import {
  applyOpportunityFilters,
  applyOpportunityFiltersWithSummary,
  getTechnicalWinCohortFilters,
  getZeroSplitExclusionSummary,
} from "@/data";
import {
  FIXTURE_AE_SEGMENT_MAPPINGS,
  FIXTURE_CATEGORY_OVERRIDES,
  FIXTURE_OPPORTUNITIES,
} from "@/fixtures";
import { DEFAULT_FILTERS } from "@/types";

describe("visible filtering and exclusion summaries", () => {
  it("summarizes zero-split exclusions by count, amount, and record", () => {
    expect(
      getZeroSplitExclusionSummary(FIXTURE_OPPORTUNITIES, "netBuArr"),
    ).toEqual({
      count: 2,
      amount: 306_000,
      arrBasis: "netBuArr",
      opportunityIds: ["006UKI000000002", "006UKI000000011"],
    });
  });

  it("keeps the exclusion summary visible whether the toggle is on or off", () => {
    const included = applyOpportunityFiltersWithSummary(
      FIXTURE_OPPORTUNITIES,
      DEFAULT_FILTERS,
      "netBuArr",
    );
    const excluded = applyOpportunityFiltersWithSummary(
      FIXTURE_OPPORTUNITIES,
      { ...DEFAULT_FILTERS, excludeZeroSplitAmount: true },
      "netBuArr",
    );

    expect(included.opportunities).toHaveLength(16);
    expect(excluded.opportunities).toHaveLength(14);
    expect(included.zeroSplitExclusion).toEqual(excluded.zeroSplitExclusion);
  });

  it("combines date, segment, and overridden-category filters", () => {
    const opportunities = applyOpportunityFilters(
      FIXTURE_OPPORTUNITIES,
      {
        ...DEFAULT_FILTERS,
        segments: ["Commercial"],
        categories: ["Expansion"],
        closeDateRange: { start: "2026-08-01", end: "2026-08-31" },
      },
      {
        mappings: FIXTURE_AE_SEGMENT_MAPPINGS,
        categoryOverrides: FIXTURE_CATEGORY_OVERRIDES,
      },
    );

    expect(opportunities.map(({ id }) => id)).toEqual(["006UKI000000014"]);
  });

  it("does not hide unknown stages when no stage filter is active", () => {
    const opportunities = applyOpportunityFilters(
      FIXTURE_OPPORTUNITIES,
      DEFAULT_FILTERS,
    );
    expect(opportunities.some(({ stage }) => stage === "Proposal")).toBe(true);
  });

  it("keeps non-date filters while removing dashboard date constraints", () => {
    const filters = {
      ...DEFAULT_FILTERS,
      stages: ["Closed Won"],
      closeDateRange: { start: "2026-01-01", end: "2026-03-31" },
      createdDateRange: { start: "2025-01-01", end: "2026-12-31" },
    };

    const cohortFilters = getTechnicalWinCohortFilters(filters);

    expect(cohortFilters.closeDateRange).toBeNull();
    expect(cohortFilters.createdDateRange).toBeNull();
    expect(cohortFilters.stages).toEqual(["Closed Won"]);
    expect(filters.closeDateRange).not.toBeNull();
    expect(filters.createdDateRange).not.toBeNull();
  });
});
