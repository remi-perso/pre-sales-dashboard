import type {
  CategoryOverride,
  CategoryResolution,
  Opportunity,
  WonCategory,
} from "@/types";

import { normalizeText, toTimestamp } from "./utils";

interface CategoryRule {
  category: WonCategory;
  keywords: readonly string[];
}

/**
 * Ordered, reviewable inference rules. More specific renewal/true-up phrases
 * appear before broad growth/expansion terms to keep classification stable.
 */
export const CATEGORY_INFERENCE_RULES: readonly CategoryRule[] = [
  {
    category: "Straight renewal",
    keywords: ["straight renewal", "standard renewal", "renewal only"],
  },
  {
    category: "Organic growth / true-up",
    keywords: [
      "true-up",
      "true up",
      "trueup",
      "organic growth",
      "overage",
      "uplift",
    ],
  },
  {
    category: "Compliance",
    keywords: [
      "compliance",
      "regulatory",
      "regulation",
      "audit finding",
      "mandate",
      "nist",
      "dora",
    ],
  },
  {
    category: "Expansion",
    keywords: [
      "expansion",
      "expand",
      "cross-sell",
      "cross sell",
      "additional users",
      "additional workforce",
      "new use case",
    ],
  },
  {
    category: "New business",
    keywords: ["new business", "new logo", "greenfield", "new customer"],
  },
  { category: "Straight renewal", keywords: ["renewal", "renew"] },
];

export interface InferredCategory {
  category: WonCategory;
  matchedKeyword: string | null;
}

export function inferWonCategoryDetailed(
  opportunity: Pick<Opportunity, "businessDrivers" | "whyDoAnything" | "name">,
): InferredCategory {
  const text = normalizeText(
    [opportunity.businessDrivers, opportunity.whyDoAnything, opportunity.name]
      .filter(Boolean)
      .join(" \n "),
  );

  for (const rule of CATEGORY_INFERENCE_RULES) {
    const matchedKeyword = rule.keywords.find((keyword) =>
      text.includes(keyword),
    );
    if (matchedKeyword) {
      return { category: rule.category, matchedKeyword };
    }
  }

  return { category: "Uncategorized", matchedKeyword: null };
}

export function inferWonCategory(
  opportunity: Pick<Opportunity, "businessDrivers" | "whyDoAnything" | "name">,
): WonCategory {
  return inferWonCategoryDetailed(opportunity).category;
}

export function latestCategoryOverride(
  opportunityId: string,
  overrides: readonly CategoryOverride[],
): CategoryOverride | null {
  let latest: CategoryOverride | null = null;
  let latestTimestamp = Number.NEGATIVE_INFINITY;

  overrides.forEach((override, index) => {
    if (override.opportunityId !== opportunityId) return;
    const timestamp = toTimestamp(override.createdAt) ?? index;
    if (latest == null || timestamp >= latestTimestamp) {
      latest = override;
      latestTimestamp = timestamp;
    }
  });

  return latest;
}

/** Applies the latest audit entry without mutating the inferred/raw values. */
export function resolveWonCategory(
  opportunity: Pick<
    Opportunity,
    "id" | "businessDrivers" | "whyDoAnything" | "name"
  >,
  overrides: readonly CategoryOverride[] = [],
): CategoryResolution {
  const inferred = inferWonCategoryDetailed(opportunity);
  const override = latestCategoryOverride(opportunity.id, overrides);
  return {
    category: override?.toCategory ?? inferred.category,
    source: override ? "override" : "inferred",
    inferredCategory: inferred.category,
    override,
    matchedKeyword: inferred.matchedKeyword,
  };
}

export const applyCategoryOverride = resolveWonCategory;
