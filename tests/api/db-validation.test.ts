import { describe, expect, it } from "vitest";

import {
  normalizeAeName,
  saveAeMappingSchema,
  saveCategoryOverrideSchema,
} from "@/db/validation";

describe("shared database API validation", () => {
  it("normalizes visually equivalent AE names to one unique key", () => {
    expect(normalizeAeName("  Alex   O’Brien  ")).toEqual({
      aeName: "Alex O’Brien",
      aeNameKey: "alex o’brien",
    });
  });

  it("trims mapping values and rejects undeclared input", () => {
    expect(
      saveAeMappingSchema.parse({
        aeName: "  Alex O’Brien ",
        segment: " Enterprise-1 ",
        changedBy: " Pat ",
      }),
    ).toEqual({
      aeName: "Alex O’Brien",
      segment: "Enterprise-1",
      changedBy: "Pat",
    });

    expect(
      saveAeMappingSchema.safeParse({
        aeName: "Alex O’Brien",
        segment: "Enterprise-1",
        changedBy: "Pat",
        unexpected: "not accepted",
      }).success,
    ).toBe(false);
  });

  it("accepts only known category labels and requires an audit reason", () => {
    const valid = {
      opportunityId: "006000000000001AAA",
      opportunityName: "Acme expansion",
      inferredCategory: "Expansion",
      toCategory: "New business",
      reason: "Confirmed with the account team.",
      changedBy: "Pat",
    } as const;

    expect(saveCategoryOverrideSchema.safeParse(valid).success).toBe(true);
    expect(
      saveCategoryOverrideSchema.safeParse({
        ...valid,
        toCategory: "Other",
      }).success,
    ).toBe(false);
    expect(
      saveCategoryOverrideSchema.safeParse({ ...valid, reason: " " }).success,
    ).toBe(false);
  });
});
