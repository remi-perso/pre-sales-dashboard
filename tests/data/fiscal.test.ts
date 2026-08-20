import { describe, expect, it } from "vitest";

import {
  aggregateFiscalTrend,
  calculateYoYComparison,
  getFiscalPeriod,
  getFiscalQuarterRange,
  getPriorYearPeriod,
} from "@/data";
import { FIXTURE_OPPORTUNITIES } from "@/fixtures";

describe("configurable fiscal periods and YoY", () => {
  it("derives fiscal boundaries without assuming calendar years", () => {
    expect(getFiscalPeriod("2026-01-31", 2)).toEqual({
      fiscalYear: 2026,
      quarter: 4,
      label: "FY2026 Q4",
    });
    expect(getFiscalPeriod("2026-02-01", 2)).toEqual({
      fiscalYear: 2027,
      quarter: 1,
      label: "FY2027 Q1",
    });
    expect(getFiscalQuarterRange(2027, 1, 2)).toEqual({
      fiscalYear: 2027,
      quarter: 1,
      label: "FY2027 Q1",
      start: "2026-02-01",
      end: "2026-04-30",
    });
  });

  it("returns the same fiscal quarter in the prior fiscal year", () => {
    expect(
      getPriorYearPeriod({ fiscalYear: 2027, quarter: 3, label: "FY2027 Q3" }),
    ).toEqual({ fiscalYear: 2026, quarter: 3, label: "FY2026 Q3" });
  });

  it("rejects invalid fiscal configuration instead of guessing", () => {
    expect(() => getFiscalPeriod("2026-02-01", 0)).toThrow(RangeError);
    expect(() => getFiscalQuarterRange(2027, 5, 2)).toThrow(RangeError);
  });

  it("compares matching fiscal quarters across years", () => {
    const comparison = calculateYoYComparison(FIXTURE_OPPORTUNITIES, {
      period: { fiscalYear: 2027, quarter: 1 },
      fiscalYearStartMonth: 2,
      arrBasis: "netBuArr",
    });

    expect(comparison.current).toEqual({ count: 2, amount: 381_000 });
    expect(comparison.prior).toEqual({ count: 1, amount: 140_000 });
    expect(comparison.countPercentChange).toBe(1);
    expect(comparison.amountPercentChange).toBeCloseTo(241 / 140);
  });

  it("sorts trend points chronologically", () => {
    const points = aggregateFiscalTrend(FIXTURE_OPPORTUNITIES, {
      fiscalYearStartMonth: 2,
      arrBasis: "netBuArr",
    });
    expect(points.map(({ label }) => label)).toEqual([
      "FY2026 Q1",
      "FY2026 Q2",
      "FY2026 Q4",
      "FY2027 Q1",
      "FY2027 Q2",
      "FY2027 Q3",
      "FY2027 Q4",
    ]);
  });
});
