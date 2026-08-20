import type {
  AeSegmentMapping,
  ArrBasis,
  DataQualitySummary,
  NullRateMetric,
  Opportunity,
  ReconciliationResult,
} from "@/types";
import { SF_FIELDS } from "@/salesforce/fields";

import { resolveSegment, UNMAPPED_SEGMENT } from "./segments";
import { finiteAmount, isPresent, safeRate } from "./utils";

export interface ReconciliationOptions {
  /** Currency-unit tolerance, defaulting to £1/$1. */
  absoluteTolerance?: number;
  /** Fractional tolerance, defaulting to 1% of the larger absolute value. */
  relativeTolerance?: number;
}

export function checkArrReconciliation(
  opportunity: Pick<Opportunity, "dealSize" | "netBuArr">,
  options: ReconciliationOptions = {},
): ReconciliationResult {
  const dealSize = finiteAmount(opportunity.dealSize);
  const netBuArr = finiteAmount(opportunity.netBuArr);
  if (dealSize == null || netBuArr == null) {
    return {
      status: "missing-value",
      dealSize,
      netBuArr,
      absoluteDifference: null,
      relativeDifference: null,
      allowedDifference: null,
      isFlagged: true,
    };
  }

  const absoluteTolerance = Math.max(0, options.absoluteTolerance ?? 1);
  const relativeTolerance = Math.max(0, options.relativeTolerance ?? 0.01);
  const maximumMagnitude = Math.max(Math.abs(dealSize), Math.abs(netBuArr));
  const absoluteDifference = Math.abs(dealSize - netBuArr);
  const allowedDifference = Math.max(
    absoluteTolerance,
    maximumMagnitude * relativeTolerance,
  );
  const relativeDifference =
    maximumMagnitude === 0 ? 0 : absoluteDifference / maximumMagnitude;
  const isFlagged = absoluteDifference > allowedDifference;

  return {
    status: isFlagged ? "diverged" : "reconciled",
    dealSize,
    netBuArr,
    absoluteDifference,
    relativeDifference,
    allowedDifference,
    isFlagged,
  };
}

export function getReconciliationFlags(
  opportunities: readonly Opportunity[],
  options: ReconciliationOptions = {},
): Array<{ opportunity: Opportunity; reconciliation: ReconciliationResult }> {
  return opportunities
    .map((opportunity) => ({
      opportunity,
      reconciliation: checkArrReconciliation(opportunity, options),
    }))
    .filter(({ reconciliation }) => reconciliation.isFlagged);
}

function nullRate(
  field: NullRateMetric["field"],
  values: readonly boolean[],
): NullRateMetric {
  const nullCount = values.filter(Boolean).length;
  return {
    field,
    nullCount,
    totalCount: values.length,
    nullRate: safeRate(nullCount, values.length),
  };
}

export function calculateDataQuality(
  opportunities: readonly Opportunity[],
  mappings: readonly AeSegmentMapping[] = [],
): DataQualitySummary {
  return {
    totalCount: opportunities.length,
    leadSalesEngineer: nullRate(
      "leadSalesEngineer",
      opportunities.map(
        (opportunity) => !isPresent(opportunity.leadSalesEngineer),
      ),
    ),
    segment: nullRate(
      "segment",
      opportunities.map(
        (opportunity) =>
          !isPresent(opportunity.ownerGeoSegment) &&
          !isPresent(opportunity.splitOwnerSalesSegment),
      ),
    ),
    unmappedSegment: nullRate(
      "unmappedSegment",
      opportunities.map(
        (opportunity) =>
          resolveSegment(opportunity, mappings).segment === UNMAPPED_SEGMENT,
      ),
    ),
    businessDrivers: nullRate(
      "businessDrivers",
      opportunities.map(
        (opportunity) => !isPresent(opportunity.businessDrivers),
      ),
    ),
  };
}

/** Useful when a view needs to state the ARR basis beside quality totals. */
export function describeArrBasis(basis: ArrBasis): string {
  return basis === "netBuArr" ? SF_FIELDS.netBuArr : SF_FIELDS.dealSize;
}
