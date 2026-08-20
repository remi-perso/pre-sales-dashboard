import type { Opportunity, StalledDealResult } from "@/types";

import {
  isTechnicalWinOrLater,
  type TechnicalWinStageOptions,
} from "./opportunities";
import { toTimestamp } from "./utils";

export interface StalledDealOptions extends TechnicalWinStageOptions {
  thresholdDays?: number;
  asOf?: string | Date;
}

const MILLISECONDS_PER_DAY = 86_400_000;

export function evaluateStalledDeal(
  opportunity: Pick<
    Opportunity,
    | "presalesStage"
    | "lastActivityDate"
    | "lastStageChangeDate"
    | "technicalWinDate"
  >,
  options: StalledDealOptions = {},
): StalledDealResult {
  const thresholdDays = Math.max(0, options.thresholdDays ?? 60);
  if (!isTechnicalWinOrLater(opportunity, options)) {
    return {
      isStalled: false,
      daysSinceActivity: null,
      referenceDate: null,
      thresholdDays,
      reason: "before-technical-win",
    };
  }

  const datedCandidates = [
    opportunity.lastActivityDate,
    opportunity.lastStageChangeDate,
    opportunity.technicalWinDate,
  ]
    .map((value) => ({ value, timestamp: toTimestamp(value) }))
    .filter(
      (candidate): candidate is { value: string; timestamp: number } =>
        candidate.value != null && candidate.timestamp != null,
    );
  const latest = datedCandidates.sort((a, b) => b.timestamp - a.timestamp)[0];
  const asOf = toTimestamp(options.asOf ?? new Date());
  if (!latest || asOf == null) {
    return {
      isStalled: false,
      daysSinceActivity: null,
      referenceDate: null,
      thresholdDays,
      reason: "missing-reference-date",
    };
  }

  const daysSinceActivity = Math.max(
    0,
    Math.floor((asOf - latest.timestamp) / MILLISECONDS_PER_DAY),
  );
  const isStalled = daysSinceActivity >= thresholdDays;
  return {
    isStalled,
    daysSinceActivity,
    referenceDate: latest.value,
    thresholdDays,
    reason: isStalled ? "stalled" : "within-threshold",
  };
}

export function getStalledDeals(
  opportunities: readonly Opportunity[],
  options: StalledDealOptions = {},
): Opportunity[] {
  return opportunities.filter(
    (opportunity) => evaluateStalledDeal(opportunity, options).isStalled,
  );
}
