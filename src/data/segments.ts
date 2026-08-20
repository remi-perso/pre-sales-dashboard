import type { AeSegmentMapping, Opportunity, SegmentResolution } from "@/types";

import { isPresent, normalizeText } from "./utils";

export const UNMAPPED_SEGMENT = "Unmapped";

/** Turns values such as `EMEA - Enterprise-1` into `Enterprise-1`. */
export function parseOwnerGeoSegment(value: string): string {
  const trimmed = value.trim();
  const separatorIndex = trimmed.indexOf(" - ");
  return separatorIndex >= 0
    ? trimmed.slice(separatorIndex + 3).trim() || trimmed
    : trimmed;
}

export function resolveSegment(
  opportunity: Pick<
    Opportunity,
    "ownerGeoSegment" | "splitOwnerSalesSegment" | "ownerName"
  >,
  mappings: readonly AeSegmentMapping[] = [],
): SegmentResolution {
  const geoSegment = isPresent(opportunity.ownerGeoSegment)
    ? parseOwnerGeoSegment(opportunity.ownerGeoSegment)
    : null;
  const splitSegment = isPresent(opportunity.splitOwnerSalesSegment)
    ? opportunity.splitOwnerSalesSegment.trim()
    : null;
  const hasDirectConflict =
    geoSegment != null &&
    splitSegment != null &&
    normalizeText(geoSegment) !== normalizeText(splitSegment);

  if (geoSegment != null) {
    return {
      segment: geoSegment,
      source: "owner-geo-segment",
      mapping: null,
      hasDirectConflict,
    };
  }

  if (splitSegment != null) {
    return {
      segment: splitSegment,
      source: "split-owner-segment",
      mapping: null,
      hasDirectConflict: false,
    };
  }

  const ownerName = normalizeText(opportunity.ownerName);
  const mapping = mappings.find(
    (candidate) => normalizeText(candidate.aeName) === ownerName,
  );
  if (mapping && isPresent(mapping.segment)) {
    return {
      segment: mapping.segment.trim(),
      source: "ae-mapping",
      mapping: { aeName: mapping.aeName, segment: mapping.segment },
      hasDirectConflict: false,
    };
  }

  return {
    segment: UNMAPPED_SEGMENT,
    source: "unmapped",
    mapping: null,
    hasDirectConflict: false,
  };
}
