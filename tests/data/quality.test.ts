import { describe, expect, it } from "vitest";

import {
  calculateDataQuality,
  checkArrReconciliation,
  evaluateStalledDeal,
  getReconciliationFlags,
  getStalledDeals,
} from "@/data";
import {
  FIXTURE_AE_SEGMENT_MAPPINGS,
  FIXTURE_OPPORTUNITIES,
  FIXTURE_SALESFORCE_RECORDS,
} from "@/fixtures";
import { SALESFORCE_OPPORTUNITY_FIELDS, SF_FIELDS } from "@/salesforce/fields";

describe("ARR reconciliation", () => {
  it("flags material divergence and surfaces both values", () => {
    const opportunity = FIXTURE_OPPORTUNITIES.find(
      ({ id }) => id === "006UKI000000003",
    )!;
    expect(checkArrReconciliation(opportunity)).toEqual({
      status: "diverged",
      dealSize: 180_000,
      netBuArr: 130_000,
      absoluteDifference: 50_000,
      relativeDifference: 50 / 180,
      allowedDifference: 1_800,
      isFlagged: true,
    });
  });

  it("does not flag a difference inside the configured tolerance", () => {
    expect(
      checkArrReconciliation({ dealSize: 250_000, netBuArr: 251_000 }),
    ).toMatchObject({ status: "reconciled", isFlagged: false });
  });

  it("makes missing values visible rather than substituting", () => {
    expect(
      checkArrReconciliation({ dealSize: null, netBuArr: 72_000 }),
    ).toMatchObject({
      status: "missing-value",
      dealSize: null,
      netBuArr: 72_000,
      isFlagged: true,
    });
    expect(getReconciliationFlags(FIXTURE_OPPORTUNITIES)).toHaveLength(2);
  });
});

describe("stalled opportunities", () => {
  it("uses the latest activity or stage-change date with a configurable N", () => {
    const opportunity = FIXTURE_OPPORTUNITIES.find(
      ({ id }) => id === "006UKI000000009",
    )!;
    expect(
      evaluateStalledDeal(opportunity, {
        thresholdDays: 60,
        asOf: "2026-08-20T00:00:00.000Z",
      }),
    ).toEqual({
      isStalled: true,
      daysSinceActivity: 141,
      referenceDate: "2026-04-01",
      thresholdDays: 60,
      reason: "stalled",
    });
  });

  it("does not stall a fresh technical win or a pre-technical-win deal", () => {
    const fresh = FIXTURE_OPPORTUNITIES.find(
      ({ id }) => id === "006UKI000000010",
    )!;
    const discovery = FIXTURE_OPPORTUNITIES.find(
      ({ id }) => id === "006UKI000000008",
    )!;
    expect(
      evaluateStalledDeal(fresh, { asOf: "2026-08-20", thresholdDays: 60 }),
    ).toMatchObject({ isStalled: false, reason: "within-threshold" });
    expect(
      evaluateStalledDeal(discovery, {
        asOf: "2026-08-20",
        thresholdDays: 60,
      }),
    ).toMatchObject({ isStalled: false, reason: "before-technical-win" });
  });

  it("finds stalled records in an explicitly open-pipeline input", () => {
    const open = FIXTURE_OPPORTUNITIES.filter(
      ({ stage }) => !stage?.startsWith("Closed") && stage !== "Qualified Out",
    );
    expect(
      getStalledDeals(open, { asOf: "2026-08-20", thresholdDays: 60 }).map(
        ({ id }) => id,
      ),
    ).toEqual(["006UKI000000009"]);
  });
});

describe("data-quality visibility and fixture fidelity", () => {
  it("calculates null rates over the current filtered set", () => {
    const summary = calculateDataQuality(
      FIXTURE_OPPORTUNITIES,
      FIXTURE_AE_SEGMENT_MAPPINGS,
    );
    expect(summary.totalCount).toBe(16);
    expect(summary.leadSalesEngineer).toMatchObject({
      nullCount: 5,
      totalCount: 16,
    });
    expect(summary.segment).toMatchObject({ nullCount: 5, totalCount: 16 });
    expect(summary.unmappedSegment).toMatchObject({
      nullCount: 2,
      totalCount: 16,
    });
    expect(summary.businessDrivers).toMatchObject({
      nullCount: 3,
      totalCount: 16,
    });
    expect(summary.segment.nullRate).toBe(5 / 16);
    expect(summary.unmappedSegment.nullRate).toBe(0.125);
  });

  it("returns null null-rates for an empty view", () => {
    const summary = calculateDataQuality([]);
    expect(summary.leadSalesEngineer.nullRate).toBeNull();
    expect(summary.segment.nullRate).toBeNull();
    expect(summary.unmappedSegment.nullRate).toBeNull();
  });

  it("keeps fixture raw keys centralized and complete", () => {
    expect(FIXTURE_SALESFORCE_RECORDS).toHaveLength(
      FIXTURE_OPPORTUNITIES.length,
    );
    expect(FIXTURE_SALESFORCE_RECORDS[0]?.[SF_FIELDS.name]).toBe(
      "Northstar Retail Workforce Identity",
    );
    expect(Object.keys(FIXTURE_SALESFORCE_RECORDS[0]!).sort()).toEqual(
      [...SALESFORCE_OPPORTUNITY_FIELDS].sort(),
    );
  });
});
