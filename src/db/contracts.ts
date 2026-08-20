export const WON_CATEGORY_VALUES = [
  "Organic growth / true-up",
  "Compliance",
  "Expansion",
  "New business",
  "Straight renewal",
  "Uncategorized",
] as const;

export type WonCategory = (typeof WON_CATEGORY_VALUES)[number];

export interface AeSegmentMappingDto {
  id: string;
  aeName: string;
  segment: string;
  changedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AeSegmentMappingAuditDto {
  id: string;
  mappingId: string;
  aeName: string;
  fromSegment: string | null;
  toSegment: string;
  reason: string | null;
  changedBy: string;
  createdAt: string;
}

export interface AeMappingsResponse {
  mappings: AeSegmentMappingDto[];
  history: AeSegmentMappingAuditDto[];
}

export interface SaveAeMappingResponse {
  mapping: AeSegmentMappingDto;
  auditEntry: AeSegmentMappingAuditDto;
  created: boolean;
}

export interface CategoryOverrideDto {
  id: string;
  opportunityId: string;
  opportunityName: string;
  fromCategory: WonCategory;
  toCategory: WonCategory;
  reason: string;
  changedBy: string;
  createdAt: string;
}

export interface CategoryOverridesResponse {
  /** The effective (latest committed) override for each returned opportunity. */
  overrides: CategoryOverrideDto[];
  /** Immutable newest-first audit rows. Empty unless history was requested. */
  history: CategoryOverrideDto[];
}

export interface SaveCategoryOverrideResponse {
  override: CategoryOverrideDto;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  };
}
