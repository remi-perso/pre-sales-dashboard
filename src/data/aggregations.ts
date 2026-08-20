import {
  WON_CATEGORIES,
  type AeSegmentMapping,
  type ArrBasis,
  type CategoryAggregate,
  type CategoryOverride,
  type Opportunity,
  type SegmentAggregate,
  type SegmentSource,
  type TrendPoint,
} from "@/types";

import { resolveWonCategory } from "./categories";
import { getFiscalPeriod } from "./fiscal";
import { isWon } from "./opportunities";
import { resolveSegment, UNMAPPED_SEGMENT } from "./segments";
import { amountFor } from "./utils";

function emptySourceCounts(): Record<SegmentSource, number> {
  return {
    "owner-geo-segment": 0,
    "split-owner-segment": 0,
    "ae-mapping": 0,
    unmapped: 0,
  };
}

export interface TrendOptions {
  fiscalYearStartMonth: number;
  arrBasis: ArrBasis;
  dateAccessor?: (opportunity: Opportunity) => string | null;
}

export function aggregateFiscalTrend(
  opportunities: readonly Opportunity[],
  options: TrendOptions,
): TrendPoint[] {
  const dateAccessor =
    options.dateAccessor ?? ((opportunity) => opportunity.closeDate);
  const grouped = new Map<string, TrendPoint>();

  for (const opportunity of opportunities) {
    const date = dateAccessor(opportunity);
    if (!date || Number.isNaN(Date.parse(date))) continue;
    const period = getFiscalPeriod(date, options.fiscalYearStartMonth);
    const existing = grouped.get(period.label) ?? {
      ...period,
      count: 0,
      amount: 0,
      arrBasis: options.arrBasis,
    };
    existing.count += 1;
    existing.amount += amountFor(opportunity, options.arrBasis) ?? 0;
    grouped.set(period.label, existing);
  }

  return [...grouped.values()].sort(
    (a, b) => a.fiscalYear - b.fiscalYear || a.quarter - b.quarter,
  );
}

export function aggregateWonCategories(
  opportunities: readonly Opportunity[],
  overrides: readonly CategoryOverride[],
  arrBasis: ArrBasis,
): CategoryAggregate[] {
  const grouped = new Map(
    WON_CATEGORIES.map((category) => [
      category,
      {
        category,
        count: 0,
        amount: 0,
        inferredCount: 0,
        overriddenCount: 0,
        arrBasis,
      } satisfies CategoryAggregate,
    ]),
  );

  for (const opportunity of opportunities.filter(isWon)) {
    const resolution = resolveWonCategory(opportunity, overrides);
    const aggregate = grouped.get(resolution.category);
    if (!aggregate) continue;
    aggregate.count += 1;
    aggregate.amount += amountFor(opportunity, arrBasis) ?? 0;
    if (resolution.source === "override") aggregate.overriddenCount += 1;
    else aggregate.inferredCount += 1;
  }

  return [...grouped.values()];
}

export function aggregateSegments(
  opportunities: readonly Opportunity[],
  mappings: readonly AeSegmentMapping[],
  arrBasis: ArrBasis,
): SegmentAggregate[] {
  const grouped = new Map<string, SegmentAggregate>();
  grouped.set(UNMAPPED_SEGMENT, {
    segment: UNMAPPED_SEGMENT,
    count: 0,
    amount: 0,
    sourceCounts: emptySourceCounts(),
    arrBasis,
  });

  for (const opportunity of opportunities) {
    const resolution = resolveSegment(opportunity, mappings);
    const existing = grouped.get(resolution.segment) ?? {
      segment: resolution.segment,
      count: 0,
      amount: 0,
      sourceCounts: emptySourceCounts(),
      arrBasis,
    };
    existing.count += 1;
    existing.amount += amountFor(opportunity, arrBasis) ?? 0;
    existing.sourceCounts[resolution.source] += 1;
    grouped.set(resolution.segment, existing);
  }

  return [...grouped.values()].sort((a, b) => {
    if (a.segment === UNMAPPED_SEGMENT) return 1;
    if (b.segment === UNMAPPED_SEGMENT) return -1;
    return a.segment.localeCompare(b.segment, "en-GB");
  });
}
