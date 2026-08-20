import type {
  AeSegmentMapping,
  AeSegmentMappingAudit,
  CategoryOverride,
} from "@/generated/prisma/client";

import type {
  AeSegmentMappingAuditDto,
  AeSegmentMappingDto,
  CategoryOverrideDto,
  WonCategory,
} from "./contracts";

export function serializeAeMapping(
  mapping: AeSegmentMapping,
): AeSegmentMappingDto {
  return {
    id: mapping.id,
    aeName: mapping.aeName,
    segment: mapping.segment,
    changedBy: mapping.changedBy,
    createdAt: mapping.createdAt.toISOString(),
    updatedAt: mapping.updatedAt.toISOString(),
  };
}

export function serializeAeMappingAudit(
  entry: AeSegmentMappingAudit,
): AeSegmentMappingAuditDto {
  return {
    id: entry.id,
    mappingId: entry.mappingId,
    aeName: entry.aeName,
    fromSegment: entry.fromSegment,
    toSegment: entry.toSegment,
    reason: entry.reason,
    changedBy: entry.changedBy,
    createdAt: entry.createdAt.toISOString(),
  };
}

export function serializeCategoryOverride(
  override: CategoryOverride,
): CategoryOverrideDto {
  return {
    id: override.id,
    opportunityId: override.opportunityId,
    opportunityName: override.opportunityName,
    fromCategory: override.fromCategory as WonCategory,
    toCategory: override.toCategory as WonCategory,
    reason: override.reason,
    changedBy: override.changedBy,
    createdAt: override.createdAt.toISOString(),
  };
}
