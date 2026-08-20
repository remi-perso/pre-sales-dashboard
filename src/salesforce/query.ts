import { SF_FIELDS } from "@/salesforce/fields";

export interface OpportunityApiFieldMap {
  id: string;
  stage: string;
  presalesStage: string;
  leadSalesEngineer: string;
  dealSize: string;
  netBuArr: string;
  splitAmount: string;
  ownerName: string;
  type: string;
  closeDate: string;
  createdDate: string;
  businessDrivers: string;
  whyDoAnything: string;
  npiUseCase: string;
  name: string;
  splitOwnerSalesSegment: string;
  ownerGeoSegment: string;
  technicalWinDate: string;
  lastActivityDate: string;
  lastStageChangeDate: string;
  /** Null means the live data source supplies its declared product scope. */
  productLine: string | null;
  /** Null means the live data source supplies its declared region scope. */
  region: string | null;
}

export const SALESFORCE_OBJECTS = Object.freeze({
  opportunity: "Opportunity",
  organization: "Organization",
});

export const ORGANIZATION_API_FIELDS = Object.freeze({
  fiscalYearStartMonth: "FiscalYearStartMonth",
});

/**
 * Conventional API-name defaults for the labels in fields.ts. Custom field API
 * names are org-specific, so callers can replace this map after an admin checks
 * Object Manager. Keeping the defaults here prevents raw API names spreading
 * into data/UI code.
 */
export const DEFAULT_OPPORTUNITY_API_FIELDS: Readonly<OpportunityApiFieldMap> =
  Object.freeze({
    id: "Id",
    stage: "StageName",
    presalesStage: "Presales_Stage__c",
    leadSalesEngineer: "Lead_Sales_Engineer__c",
    dealSize: "Deal_Size__c",
    netBuArr: "Net_BU_ARR__c",
    splitAmount: "Split_Amount__c",
    ownerName: "Owner.Name",
    type: "Type",
    closeDate: "CloseDate",
    createdDate: "CreatedDate",
    businessDrivers: "Business_Drivers__c",
    whyDoAnything: "Why_Do_Anything__c",
    npiUseCase: "NPI_Use_Case__c",
    name: "Name",
    splitOwnerSalesSegment: "Split_Owner_User_Sales_Segment__c",
    ownerGeoSegment: "Owner_Geo_Seg__c",
    technicalWinDate: "Technical_Win_Date__c",
    lastActivityDate: "LastActivityDate",
    lastStageChangeDate: "Last_Stage_Change_Date__c",
    // Product/region are source-level dimensions in Phase 1. Do not guess
    // custom fields or silently treat a missing field value as Okta / UKI.
    productLine: null,
    region: null,
  });

export const OPPORTUNITY_LABEL_BY_PROPERTY = Object.freeze({
  id: SF_FIELDS.id,
  stage: SF_FIELDS.stage,
  presalesStage: SF_FIELDS.presalesStage,
  leadSalesEngineer: SF_FIELDS.leadSalesEngineer,
  dealSize: SF_FIELDS.dealSize,
  netBuArr: SF_FIELDS.netBuArr,
  splitAmount: SF_FIELDS.splitAmount,
  ownerName: SF_FIELDS.ownerName,
  type: SF_FIELDS.type,
  closeDate: SF_FIELDS.closeDate,
  createdDate: SF_FIELDS.createdDate,
  businessDrivers: SF_FIELDS.businessDrivers,
  whyDoAnything: SF_FIELDS.whyDoAnything,
  npiUseCase: SF_FIELDS.npiUseCase,
  name: SF_FIELDS.name,
  splitOwnerSalesSegment: SF_FIELDS.splitOwnerSalesSegment,
  ownerGeoSegment: SF_FIELDS.ownerGeoSegment,
  technicalWinDate: SF_FIELDS.technicalWinDate,
  lastActivityDate: SF_FIELDS.lastActivityDate,
  lastStageChangeDate: SF_FIELDS.lastStageChangeDate,
  productLine: SF_FIELDS.productLine,
  region: SF_FIELDS.region,
} satisfies Record<keyof OpportunityApiFieldMap, string>);

type SoqlComparisonOperator = "=" | "!=" | "<" | "<=" | ">" | ">=" | "LIKE";

export interface SoqlTypedLiteral {
  kind: "date" | "datetime";
  value: string;
}

type SoqlComparisonValue = string | number | boolean | null | SoqlTypedLiteral;

export interface SoqlComparison {
  field: string;
  operator: SoqlComparisonOperator;
  value: SoqlComparisonValue;
}

export interface SoqlSetCondition {
  field: string;
  operator: "IN" | "NOT IN";
  values: readonly (string | number | boolean)[];
}

export type SoqlCondition = SoqlComparison | SoqlSetCondition;

export interface SoqlOrderBy {
  field: string;
  direction?: "ASC" | "DESC";
  nulls?: "FIRST" | "LAST";
}

export interface SoqlSelectQuery {
  object: string;
  fields: readonly string[];
  where?: readonly SoqlCondition[];
  orderBy?: readonly SoqlOrderBy[];
  limit?: number;
}

export interface OpportunityQueryFilters {
  stages?: readonly string[];
  presalesStages?: readonly string[];
  productLines?: readonly string[];
  regions?: readonly string[];
  closeDateStart?: string;
  closeDateEnd?: string;
  createdDateStart?: string;
  createdDateEnd?: string;
}

export interface OpportunityQueryOptions {
  fieldMap?: OpportunityApiFieldMap;
  filters?: OpportunityQueryFilters;
  limit?: number;
}

const SOQL_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

function assertIdentifier(value: string): string {
  if (!SOQL_IDENTIFIER.test(value)) {
    throw new Error("Invalid SOQL identifier.");
  }

  return value;
}

export class SalesforceFieldConfigurationError extends Error {
  constructor() {
    super(
      "The Salesforce Opportunity field map is invalid. Check NEXT_PUBLIC_SALESFORCE_FIELD_MAP_JSON.",
    );
    this.name = "SalesforceFieldConfigurationError";
  }
}

/**
 * Merge a deploy-time JSON override without allowing arbitrary SOQL fragments.
 * The map contains field API names only; it never contains credentials.
 */
export function getConfiguredOpportunityApiFields(
  serializedOverride: string | undefined,
): OpportunityApiFieldMap {
  if (!serializedOverride?.trim()) {
    return { ...DEFAULT_OPPORTUNITY_API_FIELDS };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(serializedOverride);
  } catch {
    throw new SalesforceFieldConfigurationError();
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new SalesforceFieldConfigurationError();
  }

  const configured: OpportunityApiFieldMap = {
    ...DEFAULT_OPPORTUNITY_API_FIELDS,
  };
  for (const [untypedProperty, untypedValue] of Object.entries(parsed)) {
    if (!Object.hasOwn(DEFAULT_OPPORTUNITY_API_FIELDS, untypedProperty)) {
      throw new SalesforceFieldConfigurationError();
    }

    const property = untypedProperty as keyof OpportunityApiFieldMap;
    if (untypedValue === null) {
      if (property !== "productLine" && property !== "region") {
        throw new SalesforceFieldConfigurationError();
      }
      configured[property] = null;
      continue;
    }

    if (
      typeof untypedValue !== "string" ||
      !SOQL_IDENTIFIER.test(untypedValue.trim())
    ) {
      throw new SalesforceFieldConfigurationError();
    }
    configured[property] = untypedValue.trim();
  }

  return configured;
}

function escapeSoqlString(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("'", "\\'")
    .replace(/[\u0000-\u001f\u007f]/g, " ");
}

function formatSoqlValue(value: SoqlComparisonValue): string {
  if (value === null) {
    return "NULL";
  }

  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Invalid numeric SOQL value.");
    }
    return String(value);
  }

  if (typeof value === "object") {
    const valid =
      (value.kind === "date" && ISO_DATE.test(value.value)) ||
      (value.kind === "datetime" && ISO_DATETIME.test(value.value));
    if (!valid) {
      throw new Error("Invalid SOQL date or datetime literal.");
    }
    return value.value;
  }

  return `'${escapeSoqlString(value)}'`;
}

function formatCondition(condition: SoqlCondition): string {
  const field = assertIdentifier(condition.field);

  if ("values" in condition) {
    if (condition.values.length === 0) {
      throw new Error("SOQL set conditions cannot be empty.");
    }

    return `${field} ${condition.operator} (${condition.values
      .map(formatSoqlValue)
      .join(", ")})`;
  }

  if (
    condition.value === null &&
    condition.operator !== "=" &&
    condition.operator !== "!="
  ) {
    throw new Error("NULL can only be compared with = or != in SOQL.");
  }

  return `${field} ${condition.operator} ${formatSoqlValue(condition.value)}`;
}

export function buildSoqlSelect(query: SoqlSelectQuery): string {
  if (query.fields.length === 0) {
    throw new Error("A SOQL query must select at least one field.");
  }

  const object = assertIdentifier(query.object);
  const fields = query.fields.map(assertIdentifier);
  const clauses = [`SELECT ${fields.join(", ")} FROM ${object}`];

  if (query.where?.length) {
    clauses.push(`WHERE ${query.where.map(formatCondition).join(" AND ")}`);
  }

  if (query.orderBy?.length) {
    const ordering = query.orderBy.map((item) => {
      const direction = item.direction ?? "ASC";
      const nulls = item.nulls ? ` NULLS ${item.nulls}` : "";
      return `${assertIdentifier(item.field)} ${direction}${nulls}`;
    });
    clauses.push(`ORDER BY ${ordering.join(", ")}`);
  }

  if (query.limit !== undefined) {
    if (
      !Number.isInteger(query.limit) ||
      query.limit < 1 ||
      query.limit > 50_000
    ) {
      throw new Error("SOQL LIMIT must be an integer from 1 to 50000.");
    }
    clauses.push(`LIMIT ${query.limit}`);
  }

  return clauses.join(" ");
}

function addSetCondition(
  conditions: SoqlCondition[],
  field: string | null,
  values: readonly string[] | undefined,
): void {
  if (field && values?.length) {
    conditions.push({ field, operator: "IN", values });
  }
}

function addDateBoundary(
  conditions: SoqlCondition[],
  field: string,
  operator: ">=" | "<=",
  value: string | undefined,
  fieldType: "date" | "datetime",
): void {
  if (!value) {
    return;
  }

  if (!ISO_DATE.test(value)) {
    throw new Error("Salesforce date filters must use YYYY-MM-DD.");
  }

  const literal: SoqlTypedLiteral =
    fieldType === "date"
      ? { kind: "date", value }
      : {
          kind: "datetime",
          value: `${value}T${operator === ">=" ? "00:00:00.000" : "23:59:59.999"}Z`,
        };
  conditions.push({ field, operator, value: literal });
}

export function buildOpportunitySoql(
  options: OpportunityQueryOptions = {},
): string {
  const fieldMap = options.fieldMap ?? DEFAULT_OPPORTUNITY_API_FIELDS;
  const filters = options.filters;
  const conditions: SoqlCondition[] = [];

  addSetCondition(conditions, fieldMap.stage, filters?.stages);
  addSetCondition(conditions, fieldMap.presalesStage, filters?.presalesStages);
  addSetCondition(conditions, fieldMap.productLine, filters?.productLines);
  addSetCondition(conditions, fieldMap.region, filters?.regions);
  addDateBoundary(
    conditions,
    fieldMap.closeDate,
    ">=",
    filters?.closeDateStart,
    "date",
  );
  addDateBoundary(
    conditions,
    fieldMap.closeDate,
    "<=",
    filters?.closeDateEnd,
    "date",
  );
  addDateBoundary(
    conditions,
    fieldMap.createdDate,
    ">=",
    filters?.createdDateStart,
    "datetime",
  );
  addDateBoundary(
    conditions,
    fieldMap.createdDate,
    "<=",
    filters?.createdDateEnd,
    "datetime",
  );

  return buildSoqlSelect({
    object: SALESFORCE_OBJECTS.opportunity,
    fields: Object.values(fieldMap).filter(
      (field): field is string => field !== null,
    ),
    where: conditions,
    orderBy: [{ field: fieldMap.closeDate, direction: "DESC", nulls: "LAST" }],
    limit: options.limit,
  });
}
