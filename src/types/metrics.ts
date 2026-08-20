import type { AttachRateScope, DateRange } from "@/types/filters";
import type {
  CategoryOverride,
  Opportunity,
  WonCategory,
} from "@/types/opportunity";

export type ArrBasis = "netBuArr" | "dealSize";
export type OpportunityPredicate = (opportunity: Opportunity) => boolean;
export type TechWinCohortId =
  | "technical-win-or-later"
  | "closed-won"
  | "all-closed"
  | "open-pipeline"
  | "presales-engaged"
  | "all-opportunities";

export interface CountAndAmount {
  count: number;
  amount: number;
}

export interface RateMetric {
  numerator: CountAndAmount;
  denominator: CountAndAmount;
  /** Null means the denominator is zero. */
  countRate: number | null;
  /** Null means the dollar denominator is zero. */
  amountRate: number | null;
  arrBasis: ArrBasis;
}

export interface AttachRateMetric extends RateMetric {
  scope: AttachRateScope;
}

export interface AmountMetric extends CountAndAmount {
  arrBasis: ArrBasis;
}

export interface CohortConversionMetric extends RateMetric {
  cohortPeriod: DateRange;
  /** Opportunity IDs make the cohort and its denominator traceable. */
  cohortOpportunityIds: string[];
  convertedOpportunityIds: string[];
}

export interface ArrSelection {
  amount: number | null;
  basis: ArrBasis;
  /** Explicitly false: selecting one ARR basis never substitutes the other. */
  usedFallback: false;
}

export interface ExclusionSummary extends CountAndAmount {
  arrBasis: ArrBasis;
  opportunityIds: string[];
}

export interface FiscalPeriod {
  fiscalYear: number;
  quarter: 1 | 2 | 3 | 4;
  label: string;
}

export interface FiscalQuarterRange extends DateRange, FiscalPeriod {}

export interface YoYComparison {
  current: CountAndAmount;
  prior: CountAndAmount;
  countChange: number;
  amountChange: number;
  countPercentChange: number | null;
  amountPercentChange: number | null;
  currentPeriod: FiscalPeriod;
  priorPeriod: FiscalPeriod;
  arrBasis: ArrBasis;
}

export interface CategoryResolution {
  category: WonCategory;
  source: "inferred" | "override";
  inferredCategory: WonCategory;
  override: CategoryOverride | null;
  matchedKeyword: string | null;
}

export type SegmentSource =
  "owner-geo-segment" | "split-owner-segment" | "ae-mapping" | "unmapped";

export interface SegmentResolution {
  segment: string;
  source: SegmentSource;
  mapping: { aeName: string; segment: string } | null;
  /** Both direct fields were populated with different normalized values. */
  hasDirectConflict: boolean;
}

export type ReconciliationStatus = "reconciled" | "diverged" | "missing-value";

export interface ReconciliationResult {
  status: ReconciliationStatus;
  dealSize: number | null;
  netBuArr: number | null;
  absoluteDifference: number | null;
  relativeDifference: number | null;
  allowedDifference: number | null;
  isFlagged: boolean;
}

export interface StalledDealResult {
  isStalled: boolean;
  daysSinceActivity: number | null;
  referenceDate: string | null;
  thresholdDays: number;
  reason:
    | "stalled"
    | "within-threshold"
    | "before-technical-win"
    | "missing-reference-date";
}

export interface NullRateMetric {
  field:
    "leadSalesEngineer" | "segment" | "unmappedSegment" | "businessDrivers";
  nullCount: number;
  totalCount: number;
  nullRate: number | null;
}

export interface DataQualitySummary {
  totalCount: number;
  leadSalesEngineer: NullRateMetric;
  /** Both direct Salesforce segment/geo-segment fields are blank. */
  segment: NullRateMetric;
  /** No direct segment and no shared AE fallback could resolve the record. */
  unmappedSegment: NullRateMetric;
  businessDrivers: NullRateMetric;
}

export interface TrendPoint extends FiscalPeriod, CountAndAmount {
  arrBasis: ArrBasis;
}

export interface CategoryAggregate extends CountAndAmount {
  category: WonCategory;
  inferredCount: number;
  overriddenCount: number;
  arrBasis: ArrBasis;
}

export interface SegmentAggregate extends CountAndAmount {
  segment: string;
  sourceCounts: Record<SegmentSource, number>;
  arrBasis: ArrBasis;
}
