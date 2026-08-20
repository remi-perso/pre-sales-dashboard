import { SF_FIELDS } from "@/salesforce/fields";
import {
  DEFAULT_OPPORTUNITY_API_FIELDS,
  OPPORTUNITY_LABEL_BY_PROPERTY,
  type OpportunityApiFieldMap,
} from "@/salesforce/query";
import type {
  Opportunity,
  ProductLine,
  Region,
  SalesforceOpportunityRecord,
} from "@/types";

export interface OpportunityMappingDefaults {
  productLine: ProductLine;
  region: Region;
}

/** The declared scope of the Phase 1 live Opportunity data source. */
export const PHASE_ONE_SOURCE_DIMENSIONS: OpportunityMappingDefaults =
  Object.freeze({
    productLine: "Okta",
    region: "UKI",
  });

export class SalesforceMappingError extends Error {
  constructor() {
    super(
      "A Salesforce opportunity could not be read because a required or dimension field was invalid.",
    );
    this.name = "SalesforceMappingError";
  }
}

type SalesforceApiRecord = Record<string, unknown>;

function getPath(source: SalesforceApiRecord, path: string): unknown {
  if (Object.hasOwn(source, path)) {
    return source[path];
  }

  let current: unknown = source;
  for (const part of path.split(".")) {
    if (
      typeof current !== "object" ||
      current === null ||
      !Object.hasOwn(current, part)
    ) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/** Convert a Salesforce REST row into the exact label-keyed fixture shape. */
export function mapApiRecordToSalesforceRecord(
  source: SalesforceApiRecord,
  fieldMap: OpportunityApiFieldMap = DEFAULT_OPPORTUNITY_API_FIELDS,
): SalesforceOpportunityRecord {
  const target: SalesforceOpportunityRecord = {};

  for (const property of Object.keys(
    fieldMap,
  ) as (keyof OpportunityApiFieldMap)[]) {
    const apiField = fieldMap[property];
    if (apiField === null) {
      continue;
    }
    const label = OPPORTUNITY_LABEL_BY_PROPERTY[property];
    target[label] = getPath(source, apiField);
  }

  return target;
}

function nullableString(value: unknown): string | null {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized || null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (typeof value === "object" && value !== null) {
    const candidate = (value as Record<string, unknown>).Name;
    return nullableString(candidate);
  }

  return null;
}

function nullableAmount(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replaceAll(",", "").trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function nullableDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value.toISOString();
  }

  return nullableString(value);
}

function requiredString(value: unknown): string {
  const result = nullableString(value);
  if (!result) {
    throw new SalesforceMappingError();
  }
  return result;
}

function productLine(value: unknown): ProductLine {
  const normalized = nullableString(value);
  if (normalized === "Okta" || normalized === "Auth0") {
    return normalized;
  }
  throw new SalesforceMappingError();
}

function region(value: unknown): Region {
  const normalized = nullableString(value);
  if (normalized === "UKI" || normalized === "Rest of EMEA") {
    return normalized;
  }
  throw new SalesforceMappingError();
}

export function mapSalesforceOpportunity(
  record: SalesforceOpportunityRecord,
): Opportunity {
  return {
    id: requiredString(record[SF_FIELDS.id]),
    name: requiredString(record[SF_FIELDS.name]),
    stage: nullableString(record[SF_FIELDS.stage]),
    presalesStage: nullableString(record[SF_FIELDS.presalesStage]),
    leadSalesEngineer: nullableString(record[SF_FIELDS.leadSalesEngineer]),
    dealSize: nullableAmount(record[SF_FIELDS.dealSize]),
    netBuArr: nullableAmount(record[SF_FIELDS.netBuArr]),
    splitAmount: nullableAmount(record[SF_FIELDS.splitAmount]),
    ownerName: nullableString(record[SF_FIELDS.ownerName]),
    type: nullableString(record[SF_FIELDS.type]),
    closeDate: nullableDate(record[SF_FIELDS.closeDate]),
    createdDate: nullableDate(record[SF_FIELDS.createdDate]),
    businessDrivers: nullableString(record[SF_FIELDS.businessDrivers]),
    whyDoAnything: nullableString(record[SF_FIELDS.whyDoAnything]),
    npiUseCase: nullableString(record[SF_FIELDS.npiUseCase]),
    splitOwnerSalesSegment: nullableString(
      record[SF_FIELDS.splitOwnerSalesSegment],
    ),
    ownerGeoSegment: nullableString(record[SF_FIELDS.ownerGeoSegment]),
    technicalWinDate: nullableDate(record[SF_FIELDS.technicalWinDate]),
    lastActivityDate: nullableDate(record[SF_FIELDS.lastActivityDate]),
    lastStageChangeDate: nullableDate(record[SF_FIELDS.lastStageChangeDate]),
    productLine: productLine(record[SF_FIELDS.productLine]),
    region: region(record[SF_FIELDS.region]),
  };
}

export function mapApiOpportunity(
  record: SalesforceApiRecord,
  fieldMap: OpportunityApiFieldMap,
  sourceDimensions: OpportunityMappingDefaults,
): Opportunity {
  const mappedRecord = mapApiRecordToSalesforceRecord(record, fieldMap);

  // Phase 1 is a declared Okta / UKI source. Source dimensions are attached
  // only when no Salesforce field is configured. If an org field is configured
  // but blank/invalid, the strict mapper rejects it rather than misclassifying.
  if (fieldMap.productLine === null) {
    mappedRecord[SF_FIELDS.productLine] = sourceDimensions.productLine;
  }
  if (fieldMap.region === null) {
    mappedRecord[SF_FIELDS.region] = sourceDimensions.region;
  }

  return mapSalesforceOpportunity(mappedRecord);
}
