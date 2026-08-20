import type {
  ArrBasis,
  AttachRateMetric,
  AttachRateScope,
  CohortConversionMetric,
  DateRange,
  Opportunity,
  OpportunityPredicate,
  RateMetric,
  AmountMetric,
} from "@/types";

import {
  isOpportunityInAttachScope,
  isTechnicalWinOrLater,
  isWon,
  type TechnicalWinStageOptions,
} from "./opportunities";
import { isDateInRange, isPresent, safeRate, sumCountAndAmount } from "./utils";

function rateMetric(
  numeratorOpportunities: readonly Opportunity[],
  denominatorOpportunities: readonly Opportunity[],
  arrBasis: ArrBasis,
): RateMetric {
  const numerator = sumCountAndAmount(numeratorOpportunities, arrBasis);
  const denominator = sumCountAndAmount(denominatorOpportunities, arrBasis);
  return {
    numerator,
    denominator,
    countRate: safeRate(numerator.count, denominator.count),
    amountRate: safeRate(numerator.amount, denominator.amount),
    arrBasis,
  };
}

export function calculateAttachRate(
  opportunities: readonly Opportunity[],
  scope: AttachRateScope,
  arrBasis: ArrBasis,
): AttachRateMetric {
  const denominatorOpportunities = opportunities.filter((opportunity) =>
    isOpportunityInAttachScope(opportunity, scope),
  );
  const numeratorOpportunities = denominatorOpportunities.filter(
    (opportunity) => isPresent(opportunity.leadSalesEngineer),
  );
  return {
    ...rateMetric(numeratorOpportunities, denominatorOpportunities, arrBasis),
    scope,
  };
}

export function calculateTechnicalWinArr(
  opportunities: readonly Opportunity[],
  arrBasis: ArrBasis,
  stageOptions: TechnicalWinStageOptions = {},
): AmountMetric {
  const qualifying = opportunities.filter((opportunity) =>
    isTechnicalWinOrLater(opportunity, stageOptions),
  );
  return { ...sumCountAndAmount(qualifying, arrBasis), arrBasis };
}

export interface TechWinRateOptions {
  /** Explicit and independent because leadership's numerator is unconfirmed. */
  numeratorPredicate: OpportunityPredicate;
  /** Explicit and independent because leadership's denominator is unconfirmed. */
  denominatorPredicate: OpportunityPredicate;
  arrBasis: ArrBasis;
}

export function calculateTechWinRate(
  opportunities: readonly Opportunity[],
  options: TechWinRateOptions,
): RateMetric {
  return rateMetric(
    opportunities.filter(options.numeratorPredicate),
    opportunities.filter(options.denominatorPredicate),
    options.arrBasis,
  );
}

export interface TechnicalWinCohortOptions {
  cohortPeriod: DateRange;
  arrBasis: ArrBasis;
}

/**
 * Builds the denominator only from technical-win dates in the requested period;
 * won conversion is intentionally not constrained by close date.
 */
export function calculateTechnicalWinToWonCohort(
  opportunities: readonly Opportunity[],
  options: TechnicalWinCohortOptions,
): CohortConversionMetric {
  const cohort = opportunities.filter((opportunity) =>
    isDateInRange(opportunity.technicalWinDate, options.cohortPeriod),
  );
  const converted = cohort.filter(isWon);
  return {
    ...rateMetric(converted, cohort, options.arrBasis),
    cohortPeriod: options.cohortPeriod,
    cohortOpportunityIds: cohort.map(({ id }) => id),
    convertedOpportunityIds: converted.map(({ id }) => id),
  };
}
