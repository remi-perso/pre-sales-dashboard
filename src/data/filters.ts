import type {
  AeSegmentMapping,
  ArrBasis,
  CategoryOverride,
  ExclusionSummary,
  Opportunity,
  OpportunityFilters,
} from "@/types";

import { resolveWonCategory } from "./categories";
import { resolveSegment } from "./segments";
import { amountFor, isDateInRange, normalizeText } from "./utils";

export interface FilterContext {
  mappings?: readonly AeSegmentMapping[];
  categoryOverrides?: readonly CategoryOverride[];
}

function includesNormalized(
  selectedValues: readonly string[] | undefined,
  actualValue: string | null,
): boolean {
  if (!selectedValues || selectedValues.length === 0) return true;
  const actual = normalizeText(actualValue);
  return selectedValues.some((selected) => normalizeText(selected) === actual);
}

function matchesFiltersExceptZeroSplit(
  opportunity: Opportunity,
  filters: OpportunityFilters,
  context: FilterContext,
): boolean {
  if (!filters.productLines.includes(opportunity.productLine)) return false;
  if (!filters.regions.includes(opportunity.region)) return false;
  if (!includesNormalized(filters.stages, opportunity.stage)) return false;
  if (!includesNormalized(filters.presalesStages, opportunity.presalesStage)) {
    return false;
  }
  if (
    filters.closeDateRange &&
    !isDateInRange(opportunity.closeDate, filters.closeDateRange)
  ) {
    return false;
  }
  if (
    filters.createdDateRange &&
    !isDateInRange(opportunity.createdDate, filters.createdDateRange)
  ) {
    return false;
  }
  if (
    !includesNormalized(
      filters.segments,
      resolveSegment(opportunity, context.mappings).segment,
    )
  ) {
    return false;
  }
  if (
    filters.categories &&
    filters.categories.length > 0 &&
    !filters.categories.includes(
      resolveWonCategory(opportunity, context.categoryOverrides).category,
    )
  ) {
    return false;
  }
  return true;
}

export function getZeroSplitExclusionSummary(
  opportunities: readonly Opportunity[],
  arrBasis: ArrBasis,
): ExclusionSummary {
  const excluded = opportunities.filter(
    (opportunity) => opportunity.splitAmount === 0,
  );
  return {
    count: excluded.length,
    amount: excluded.reduce(
      (sum, opportunity) => sum + (amountFor(opportunity, arrBasis) ?? 0),
      0,
    ),
    arrBasis,
    opportunityIds: excluded.map(({ id }) => id),
  };
}

export function applyOpportunityFilters(
  opportunities: readonly Opportunity[],
  filters: OpportunityFilters,
  context: FilterContext = {},
): Opportunity[] {
  return opportunities.filter(
    (opportunity) =>
      matchesFiltersExceptZeroSplit(opportunity, filters, context) &&
      (!filters.excludeZeroSplitAmount || opportunity.splitAmount !== 0),
  );
}

export interface FilterResult {
  opportunities: Opportunity[];
  /** Summary is calculated after all other filters and is always present. */
  zeroSplitExclusion: ExclusionSummary;
}

/**
 * Technical-Win conversion is defined by the date Technical Win was reached.
 * Close/created-date constraints would remove outcomes outside the comparison
 * period and corrupt cohort or YoY results, so non-date filters are retained
 * while dashboard date ranges are cleared.
 */
export function getTechnicalWinCohortFilters(
  filters: OpportunityFilters,
): OpportunityFilters {
  return { ...filters, closeDateRange: null, createdDateRange: null };
}

export function applyOpportunityFiltersWithSummary(
  opportunities: readonly Opportunity[],
  filters: OpportunityFilters,
  arrBasis: ArrBasis,
  context: FilterContext = {},
): FilterResult {
  const beforeZeroSplitRule = opportunities.filter((opportunity) =>
    matchesFiltersExceptZeroSplit(opportunity, filters, context),
  );
  return {
    opportunities: filters.excludeZeroSplitAmount
      ? beforeZeroSplitRule.filter(
          (opportunity) => opportunity.splitAmount !== 0,
        )
      : beforeZeroSplitRule,
    zeroSplitExclusion: getZeroSplitExclusionSummary(
      beforeZeroSplitRule,
      arrBasis,
    ),
  };
}
