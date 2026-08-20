import type { SalesforceOpportunityFieldName } from "@/salesforce/fields";

export const PRODUCT_LINES = ["Okta", "Auth0"] as const;
export type ProductLine = (typeof PRODUCT_LINES)[number];

export const REGIONS = ["UKI", "Rest of EMEA"] as const;
export type Region = (typeof REGIONS)[number];

export const AVAILABLE_PRODUCT_LINES = [
  "Okta",
] as const satisfies readonly ProductLine[];
export const AVAILABLE_REGIONS = ["UKI"] as const satisfies readonly Region[];

export const OPPORTUNITY_OUTCOMES = [
  "won",
  "lost-or-disqualified",
  "open",
] as const;
export type OpportunityOutcome = (typeof OPPORTUNITY_OUTCOMES)[number];

export const PRESALES_STAGES = [
  "Not Started",
  "Technical Discovery",
  "Technical Validation",
  "Technical Win",
] as const;
export type KnownPresalesStage = (typeof PRESALES_STAGES)[number];

/**
 * The normalized, UI-facing Opportunity shape. Strings remain open rather than
 * Salesforce-enum unions so a new org value is never silently discarded.
 */
export interface Opportunity {
  id: string;
  name: string;
  stage: string | null;
  presalesStage: string | null;
  leadSalesEngineer: string | null;
  dealSize: number | null;
  netBuArr: number | null;
  splitAmount: number | null;
  ownerName: string | null;
  type: string | null;
  closeDate: string | null;
  createdDate: string | null;
  businessDrivers: string | null;
  whyDoAnything: string | null;
  npiUseCase: string | null;
  splitOwnerSalesSegment: string | null;
  ownerGeoSegment: string | null;
  technicalWinDate: string | null;
  lastActivityDate: string | null;
  lastStageChangeDate: string | null;
  productLine: ProductLine;
  region: Region;
}

/** Raw fixture/query rows are keyed by centrally declared Salesforce labels. */
export type SalesforceOpportunityRecord = Partial<
  Record<SalesforceOpportunityFieldName, unknown>
>;

export interface AeSegmentMapping {
  id?: string;
  aeName: string;
  segment: string;
  createdAt?: string;
  updatedAt?: string;
  changedBy?: string;
}

export const WON_CATEGORIES = [
  "Organic growth / true-up",
  "Compliance",
  "Expansion",
  "New business",
  "Straight renewal",
  "Uncategorized",
] as const;
export type WonCategory = (typeof WON_CATEGORIES)[number];

export interface CategoryOverride {
  id?: string;
  opportunityId: string;
  opportunityName?: string;
  fromCategory: WonCategory;
  toCategory: WonCategory;
  reason: string;
  changedBy: string;
  createdAt: string;
}
