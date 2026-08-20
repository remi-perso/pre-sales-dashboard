"use client";

import {
  getSalesforceApiVersion,
  salesforceFetch,
  SalesforceRequestError,
  SalesforceResponseError,
} from "@/salesforce/client";
import {
  mapApiOpportunity,
  mapSalesforceOpportunity,
  type OpportunityMappingDefaults,
  PHASE_ONE_SOURCE_DIMENSIONS,
} from "@/salesforce/mapper";
import {
  buildOpportunitySoql,
  buildSoqlSelect,
  DEFAULT_OPPORTUNITY_API_FIELDS,
  ORGANIZATION_API_FIELDS,
  SALESFORCE_OBJECTS,
  type OpportunityApiFieldMap,
} from "@/salesforce/query";
import type { Opportunity, SalesforceOpportunityRecord } from "@/types";

export type SalesforceDataSourceMode = "fixtures" | "live";

export interface OpportunitySnapshot {
  opportunities: Opportunity[];
  source: SalesforceDataSourceMode;
  syncedAt: string;
  /** Salesforce's server total when live; fixture length in fixture mode. */
  totalSize: number;
}

export interface FiscalYearStartResult {
  /** Calendar month, 1 (January) through 12 (December). */
  month: number;
  source: "salesforce-organization" | "configured-fallback";
}

export interface LoadOpportunitiesOptions {
  signal?: AbortSignal;
}

export interface SalesforceDataSource {
  readonly mode: SalesforceDataSourceMode;
  loadOpportunities(
    options?: LoadOpportunitiesOptions,
  ): Promise<OpportunitySnapshot>;
  getFiscalYearStartMonth(
    configuredFallback: number,
    signal?: AbortSignal,
  ): Promise<FiscalYearStartResult>;
}

export interface FixtureDataSourceOptions {
  records: readonly SalesforceOpportunityRecord[];
  now?: () => Date;
}

export interface LiveDataSourceOptions {
  fieldMap?: OpportunityApiFieldMap;
  sourceDimensions?: OpportunityMappingDefaults;
  apiVersion?: string;
  now?: () => Date;
}

interface SalesforceQueryResponse<TRecord extends Record<string, unknown>> {
  totalSize: number;
  done: boolean;
  records: TRecord[];
  nextRecordsUrl?: string;
}

const MAX_QUERY_PAGES = 10_000;

function validateFiscalStartMonth(month: number): number {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Fiscal-year start month must be from 1 to 12.");
  }
  return month;
}

export class FixtureSalesforceDataSource implements SalesforceDataSource {
  readonly mode = "fixtures" as const;

  private readonly records: readonly SalesforceOpportunityRecord[];
  private readonly now: () => Date;

  constructor(options: FixtureDataSourceOptions) {
    this.records = options.records;
    this.now = options.now ?? (() => new Date());
  }

  async loadOpportunities(
    options: LoadOpportunitiesOptions = {},
  ): Promise<OpportunitySnapshot> {
    if (options.signal?.aborted) {
      throw new DOMException("The fixture request was aborted.", "AbortError");
    }

    const opportunities = this.records.map(mapSalesforceOpportunity);

    return {
      opportunities,
      source: this.mode,
      syncedAt: this.now().toISOString(),
      totalSize: opportunities.length,
    };
  }

  async getFiscalYearStartMonth(
    configuredFallback: number,
  ): Promise<FiscalYearStartResult> {
    return {
      month: validateFiscalStartMonth(configuredFallback),
      source: "configured-fallback",
    };
  }
}

export class LiveSalesforceDataSource implements SalesforceDataSource {
  readonly mode = "live" as const;

  private readonly fieldMap: OpportunityApiFieldMap;
  private readonly sourceDimensions: OpportunityMappingDefaults;
  private readonly apiVersion: string;
  private readonly now: () => Date;

  constructor(options: LiveDataSourceOptions = {}) {
    this.fieldMap = options.fieldMap ?? DEFAULT_OPPORTUNITY_API_FIELDS;
    this.sourceDimensions =
      options.sourceDimensions ?? PHASE_ONE_SOURCE_DIMENSIONS;
    this.apiVersion = options.apiVersion ?? getSalesforceApiVersion();
    this.now = options.now ?? (() => new Date());
  }

  async loadOpportunities(
    options: LoadOpportunitiesOptions = {},
  ): Promise<OpportunitySnapshot> {
    const soql = buildOpportunitySoql({ fieldMap: this.fieldMap });
    let nextPath: string | undefined =
      `/services/data/${this.apiVersion}/query?q=${encodeURIComponent(soql)}`;
    const records: Record<string, unknown>[] = [];
    let totalSize = 0;
    let pageCount = 0;

    while (nextPath) {
      pageCount += 1;
      if (pageCount > MAX_QUERY_PAGES) {
        throw new SalesforceResponseError();
      }

      const page: SalesforceQueryResponse<Record<string, unknown>> =
        await salesforceFetch(nextPath, { signal: options.signal });
      if (!Array.isArray(page.records)) {
        throw new SalesforceResponseError();
      }

      totalSize = page.totalSize;
      records.push(...page.records);
      nextPath = page.done ? undefined : page.nextRecordsUrl;
      if (!page.done && !nextPath) {
        throw new SalesforceResponseError();
      }
    }

    return {
      opportunities: records.map((record) =>
        mapApiOpportunity(record, this.fieldMap, this.sourceDimensions),
      ),
      source: this.mode,
      syncedAt: this.now().toISOString(),
      totalSize,
    };
  }

  async getFiscalYearStartMonth(
    configuredFallback: number,
    signal?: AbortSignal,
  ): Promise<FiscalYearStartResult> {
    const fallback = validateFiscalStartMonth(configuredFallback);
    const soql = buildSoqlSelect({
      object: SALESFORCE_OBJECTS.organization,
      fields: [ORGANIZATION_API_FIELDS.fiscalYearStartMonth],
      limit: 1,
    });

    try {
      const response = await salesforceFetch<
        SalesforceQueryResponse<Record<string, unknown>>
      >(
        `/services/data/${this.apiVersion}/query?q=${encodeURIComponent(soql)}`,
        { signal },
      );
      if (!Array.isArray(response.records)) {
        return { month: fallback, source: "configured-fallback" };
      }
      const month =
        response.records[0]?.[ORGANIZATION_API_FIELDS.fiscalYearStartMonth];

      if (
        typeof month === "number" &&
        Number.isInteger(month) &&
        month >= 1 &&
        month <= 12
      ) {
        return { month, source: "salesforce-organization" };
      }

      return { month: fallback, source: "configured-fallback" };
    } catch (error) {
      // INVALID_FIELD/insufficient Organization access means this setting is
      // not queryable for this user. Auth/network failures remain actionable.
      if (
        error instanceof SalesforceResponseError ||
        (error instanceof SalesforceRequestError &&
          [400, 403, 404].includes(error.status))
      ) {
        return { month: fallback, source: "configured-fallback" };
      }
      throw error;
    }
  }
}
