import type { ProductLine, Region, WonCategory } from "@/types/opportunity";

export const ATTACH_RATE_SCOPES = [
  "won",
  "lost-disqualified",
  "all-closed",
  "open-pipeline",
  "all",
] as const;
export type AttachRateScope = (typeof ATTACH_RATE_SCOPES)[number];

export interface DateRange {
  /** Inclusive ISO date or timestamp. */
  start: string;
  /** Inclusive ISO date or timestamp. */
  end: string;
}

export interface OpportunityFilters {
  productLines: readonly ProductLine[];
  regions: readonly Region[];
  stages?: readonly string[];
  presalesStages?: readonly string[];
  segments?: readonly string[];
  categories?: readonly WonCategory[];
  closeDateRange?: DateRange | null;
  createdDateRange?: DateRange | null;
  excludeZeroSplitAmount: boolean;
}

export const DEFAULT_FILTERS: OpportunityFilters = {
  productLines: ["Okta"],
  regions: ["UKI"],
  excludeZeroSplitAmount: false,
};
