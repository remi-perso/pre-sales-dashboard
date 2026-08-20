import type {
  ArrBasis,
  FiscalPeriod,
  FiscalQuarterRange,
  Opportunity,
  OpportunityPredicate,
  YoYComparison,
} from "@/types";

import {
  isDateInRange,
  percentChange,
  sumCountAndAmount,
  toTimestamp,
} from "./utils";

function validateFiscalStartMonth(fiscalYearStartMonth: number): void {
  if (
    !Number.isInteger(fiscalYearStartMonth) ||
    fiscalYearStartMonth < 1 ||
    fiscalYearStartMonth > 12
  ) {
    throw new RangeError(
      "fiscalYearStartMonth must be an integer from 1 to 12",
    );
  }
}

function validateQuarter(quarter: number): asserts quarter is 1 | 2 | 3 | 4 {
  if (!Number.isInteger(quarter) || quarter < 1 || quarter > 4) {
    throw new RangeError("quarter must be an integer from 1 to 4");
  }
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Fiscal-year labels use the year in which the fiscal year ends. */
export function getFiscalPeriod(
  value: string | Date,
  fiscalYearStartMonth: number,
): FiscalPeriod {
  validateFiscalStartMonth(fiscalYearStartMonth);
  const timestamp = toTimestamp(value);
  if (timestamp == null) throw new RangeError("value must be a valid date");

  const date = new Date(timestamp);
  const calendarYear = date.getUTCFullYear();
  const calendarMonth = date.getUTCMonth() + 1;
  const relativeMonth = (calendarMonth - fiscalYearStartMonth + 12) % 12;
  const quarter = (Math.floor(relativeMonth / 3) + 1) as 1 | 2 | 3 | 4;
  const fiscalStartYear =
    calendarMonth >= fiscalYearStartMonth ? calendarYear : calendarYear - 1;
  const fiscalYear =
    fiscalYearStartMonth === 1 ? fiscalStartYear : fiscalStartYear + 1;

  return { fiscalYear, quarter, label: `FY${fiscalYear} Q${quarter}` };
}

export function getFiscalQuarterRange(
  fiscalYear: number,
  quarterInput: number,
  fiscalYearStartMonth: number,
): FiscalQuarterRange {
  validateFiscalStartMonth(fiscalYearStartMonth);
  validateQuarter(quarterInput);
  const fiscalStartYear =
    fiscalYearStartMonth === 1 ? fiscalYear : fiscalYear - 1;
  const quarterStart = new Date(
    Date.UTC(
      fiscalStartYear,
      fiscalYearStartMonth - 1 + (quarterInput - 1) * 3,
      1,
    ),
  );
  const nextQuarterStart = new Date(
    Date.UTC(fiscalStartYear, fiscalYearStartMonth - 1 + quarterInput * 3, 1),
  );
  const quarterEnd = new Date(nextQuarterStart.getTime() - 86_400_000);

  return {
    fiscalYear,
    quarter: quarterInput,
    label: `FY${fiscalYear} Q${quarterInput}`,
    start: toIsoDate(quarterStart),
    end: toIsoDate(quarterEnd),
  };
}

export function getPriorYearPeriod(period: FiscalPeriod): FiscalPeriod {
  return {
    fiscalYear: period.fiscalYear - 1,
    quarter: period.quarter,
    label: `FY${period.fiscalYear - 1} Q${period.quarter}`,
  };
}

export interface YoYOptions {
  period: Pick<FiscalPeriod, "fiscalYear" | "quarter">;
  fiscalYearStartMonth: number;
  arrBasis: ArrBasis;
  dateAccessor?: (opportunity: Opportunity) => string | null;
  predicate?: OpportunityPredicate;
}

export function calculateYoYComparison(
  opportunities: readonly Opportunity[],
  options: YoYOptions,
): YoYComparison {
  const currentRange = getFiscalQuarterRange(
    options.period.fiscalYear,
    options.period.quarter,
    options.fiscalYearStartMonth,
  );
  const priorRange = getFiscalQuarterRange(
    options.period.fiscalYear - 1,
    options.period.quarter,
    options.fiscalYearStartMonth,
  );
  const dateAccessor =
    options.dateAccessor ?? ((opportunity) => opportunity.closeDate);
  const predicate = options.predicate ?? (() => true);
  const eligible = opportunities.filter(predicate);
  const currentOpportunities = eligible.filter((opportunity) =>
    isDateInRange(dateAccessor(opportunity), currentRange),
  );
  const priorOpportunities = eligible.filter((opportunity) =>
    isDateInRange(dateAccessor(opportunity), priorRange),
  );
  const current = sumCountAndAmount(currentOpportunities, options.arrBasis);
  const prior = sumCountAndAmount(priorOpportunities, options.arrBasis);

  return {
    current,
    prior,
    countChange: current.count - prior.count,
    amountChange: current.amount - prior.amount,
    countPercentChange: percentChange(current.count, prior.count),
    amountPercentChange: percentChange(current.amount, prior.amount),
    currentPeriod: currentRange,
    priorPeriod: priorRange,
    arrBasis: options.arrBasis,
  };
}
