import { describe, expect, it } from "vitest";

import {
  aggregateSegments,
  aggregateWonCategories,
  inferWonCategory,
  resolveSegment,
  resolveWonCategory,
} from "@/data";
import {
  FIXTURE_AE_SEGMENT_MAPPINGS,
  FIXTURE_CATEGORY_OVERRIDES,
  FIXTURE_OPPORTUNITIES,
} from "@/fixtures";
import type { CategoryOverride } from "@/types";

describe("category inference and audited overrides", () => {
  it("infers every declared won category from the reviewable fields", () => {
    const byId = new Map(FIXTURE_OPPORTUNITIES.map((item) => [item.id, item]));
    expect(inferWonCategory(byId.get("006UKI000000001")!)).toBe("New business");
    expect(inferWonCategory(byId.get("006UKI000000002")!)).toBe(
      "Organic growth / true-up",
    );
    expect(inferWonCategory(byId.get("006UKI000000003")!)).toBe("Compliance");
    expect(inferWonCategory(byId.get("006UKI000000004")!)).toBe("Expansion");
    expect(inferWonCategory(byId.get("006UKI000000005")!)).toBe(
      "Straight renewal",
    );
  });

  it("takes the latest override while preserving the inferred category", () => {
    const opportunity = FIXTURE_OPPORTUNITIES.find(
      ({ id }) => id === "006UKI000000014",
    )!;
    const secondOverride: CategoryOverride = {
      opportunityId: opportunity.id,
      fromCategory: "Expansion",
      toCategory: "Compliance",
      reason: "Later correction",
      changedBy: "Reviewer",
      createdAt: "2026-08-09T00:00:00.000Z",
    };
    const result = resolveWonCategory(opportunity, [
      ...FIXTURE_CATEGORY_OVERRIDES,
      secondOverride,
    ]);

    expect(result.category).toBe("Compliance");
    expect(result.inferredCategory).toBe("Uncategorized");
    expect(result.source).toBe("override");
    expect(result.override).toBe(secondOverride);
  });

  it("aggregates only won opportunities and reports inferred vs overridden", () => {
    const aggregates = aggregateWonCategories(
      FIXTURE_OPPORTUNITIES,
      FIXTURE_CATEGORY_OVERRIDES,
      "netBuArr",
    );
    const expansion = aggregates.find(
      ({ category }) => category === "Expansion",
    );
    const uncategorized = aggregates.find(
      ({ category }) => category === "Uncategorized",
    );

    expect(expansion).toMatchObject({
      count: 2,
      amount: 167_000,
      inferredCount: 1,
      overriddenCount: 1,
    });
    expect(uncategorized).toMatchObject({ count: 0, amount: 0 });
    expect(aggregates.reduce((sum, item) => sum + item.count, 0)).toBe(7);
  });
});

describe("segment resolution and explicit Unmapped bucket", () => {
  it("uses direct geo, then split segment, then shared AE mapping", () => {
    const byId = new Map(FIXTURE_OPPORTUNITIES.map((item) => [item.id, item]));
    expect(
      resolveSegment(byId.get("006UKI000000001")!, FIXTURE_AE_SEGMENT_MAPPINGS),
    ).toMatchObject({ segment: "Enterprise-1", source: "owner-geo-segment" });
    expect(
      resolveSegment(byId.get("006UKI000000002")!, FIXTURE_AE_SEGMENT_MAPPINGS),
    ).toMatchObject({ segment: "Enterprise-2", source: "split-owner-segment" });
    expect(
      resolveSegment(byId.get("006UKI000000014")!, FIXTURE_AE_SEGMENT_MAPPINGS),
    ).toMatchObject({ segment: "Commercial", source: "ae-mapping" });
    expect(
      resolveSegment(byId.get("006UKI000000009")!, FIXTURE_AE_SEGMENT_MAPPINGS),
    ).toMatchObject({ segment: "Unmapped", source: "unmapped" });
  });

  it("flags conflicting populated direct fields and never consults mapping first", () => {
    const base = FIXTURE_OPPORTUNITIES[0]!;
    const result = resolveSegment(
      {
        ...base,
        ownerGeoSegment: "EMEA - Enterprise-1",
        splitOwnerSalesSegment: "Commercial",
      },
      [{ aeName: base.ownerName!, segment: "Public Sector" }],
    );
    expect(result).toMatchObject({
      segment: "Enterprise-1",
      source: "owner-geo-segment",
      hasDirectConflict: true,
    });
  });

  it("always emits an Unmapped aggregate with traceable count and amount", () => {
    const aggregates = aggregateSegments(
      FIXTURE_OPPORTUNITIES,
      FIXTURE_AE_SEGMENT_MAPPINGS,
      "netBuArr",
    );
    expect(aggregates.at(-1)).toMatchObject({
      segment: "Unmapped",
      count: 2,
      amount: 340_000,
      sourceCounts: { unmapped: 2 },
    });
  });
});
