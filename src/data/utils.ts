import type { ArrBasis, CountAndAmount } from "@/types";
import type { Opportunity } from "@/types";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/u;

export function isPresent(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function normalizeText(value: string | null | undefined): string {
  return value?.trim().toLocaleLowerCase("en-GB") ?? "";
}

export function toTimestamp(
  value: string | Date | null | undefined,
): number | null {
  if (value == null || value === "") return null;
  const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function rangeBoundary(value: string, isEnd: boolean): number | null {
  const timestamp = toTimestamp(value);
  if (timestamp == null) return null;
  return isEnd && DATE_ONLY.test(value)
    ? timestamp + 86_400_000 - 1
    : timestamp;
}

export function isDateInRange(
  value: string | null,
  range: { start: string; end: string },
): boolean {
  const timestamp = toTimestamp(value);
  const start = rangeBoundary(range.start, false);
  const end = rangeBoundary(range.end, true);
  return (
    timestamp != null &&
    start != null &&
    end != null &&
    timestamp >= start &&
    timestamp <= end
  );
}

export function finiteAmount(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function amountFor(
  opportunity: Opportunity,
  basis: ArrBasis,
): number | null {
  return finiteAmount(opportunity[basis]);
}

export function sumCountAndAmount(
  opportunities: readonly Opportunity[],
  basis: ArrBasis,
): CountAndAmount {
  return {
    count: opportunities.length,
    amount: opportunities.reduce(
      (sum, opportunity) => sum + (amountFor(opportunity, basis) ?? 0),
      0,
    ),
  };
}

export function safeRate(
  numerator: number,
  denominator: number,
): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

export function percentChange(current: number, prior: number): number | null {
  return prior === 0 ? null : (current - prior) / Math.abs(prior);
}
