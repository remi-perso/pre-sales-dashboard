import { PRESALES_STAGES } from "@/types";
import type {
  ArrBasis,
  ArrSelection,
  AttachRateScope,
  Opportunity,
  OpportunityOutcome,
  OpportunityPredicate,
  TechWinCohortId,
} from "@/types";

import { amountFor, isPresent, normalizeText } from "./utils";

export const DEFAULT_TECHNICAL_WIN_STAGE = "Technical Win";
export const DEFAULT_PRESALES_STAGE_ORDER: readonly string[] = PRESALES_STAGES;

const WON_STAGES = new Set(["won", "closed won"]);
const LOST_OR_DISQUALIFIED_STAGES = new Set([
  "lost",
  "closed lost",
  "qualified out",
  "disqualified",
]);

export function getOpportunityOutcome(
  opportunity: Pick<Opportunity, "stage">,
): OpportunityOutcome {
  const stage = normalizeText(opportunity.stage);
  if (WON_STAGES.has(stage)) return "won";
  if (
    LOST_OR_DISQUALIFIED_STAGES.has(stage) ||
    stage.includes("disqualif") ||
    stage.endsWith(" lost")
  ) {
    return "lost-or-disqualified";
  }
  return "open";
}

export function isWon(opportunity: Pick<Opportunity, "stage">): boolean {
  return getOpportunityOutcome(opportunity) === "won";
}

export function isLostOrDisqualified(
  opportunity: Pick<Opportunity, "stage">,
): boolean {
  return getOpportunityOutcome(opportunity) === "lost-or-disqualified";
}

export function isClosed(opportunity: Pick<Opportunity, "stage">): boolean {
  const normalizedStage = normalizeText(opportunity.stage);
  return (
    getOpportunityOutcome(opportunity) !== "open" ||
    normalizedStage.startsWith("closed ")
  );
}

export function isOpen(opportunity: Pick<Opportunity, "stage">): boolean {
  return !isClosed(opportunity);
}

export function isOpportunityInAttachScope(
  opportunity: Pick<Opportunity, "stage">,
  scope: AttachRateScope,
): boolean {
  switch (scope) {
    case "won":
      return isWon(opportunity);
    case "lost-disqualified":
      return isLostOrDisqualified(opportunity);
    case "all-closed":
      return isClosed(opportunity);
    case "open-pipeline":
      return isOpen(opportunity);
    case "all":
      return true;
  }
}

export interface TechnicalWinStageOptions {
  technicalWinStage?: string;
  stageOrder?: readonly string[];
}

export function isTechnicalWinOrLater(
  opportunity: Pick<Opportunity, "presalesStage">,
  options: TechnicalWinStageOptions = {},
): boolean {
  const technicalWinStage = normalizeText(
    options.technicalWinStage ?? DEFAULT_TECHNICAL_WIN_STAGE,
  );
  const stage = normalizeText(opportunity.presalesStage);
  if (stage === technicalWinStage) return true;

  const order = options.stageOrder ?? DEFAULT_PRESALES_STAGE_ORDER;
  const normalizedOrder = order.map(normalizeText);
  const thresholdIndex = normalizedOrder.indexOf(technicalWinStage);
  const stageIndex = normalizedOrder.indexOf(stage);
  return thresholdIndex >= 0 && stageIndex > thresholdIndex;
}

/** Selects one explicit ARR basis and never silently substitutes the other. */
export function selectArr(
  opportunity: Opportunity,
  basis: ArrBasis,
): ArrSelection {
  return { amount: amountFor(opportunity, basis), basis, usedFallback: false };
}

/** Keeps configurable Tech Win Rate cohort semantics out of UI components. */
export function getTechWinCohortPredicate(
  cohort: TechWinCohortId,
  stageOptions: TechnicalWinStageOptions = {},
): OpportunityPredicate {
  switch (cohort) {
    case "technical-win-or-later":
      return (opportunity) => isTechnicalWinOrLater(opportunity, stageOptions);
    case "closed-won":
      return isWon;
    case "all-closed":
      return isClosed;
    case "open-pipeline":
      return isOpen;
    case "presales-engaged":
      return (opportunity) => isPresent(opportunity.presalesStage);
    case "all-opportunities":
      return () => true;
  }
}

export const resolveTechWinCohortPredicate = getTechWinCohortPredicate;
