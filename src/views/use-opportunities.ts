"use client";

import { useQuery } from "@tanstack/react-query";

import { FIXTURE_SALESFORCE_RECORDS, FIXTURE_SYNCED_AT } from "@/fixtures";
import {
  FixtureSalesforceDataSource,
  LiveSalesforceDataSource,
  type FiscalYearStartResult,
  type OpportunitySnapshot,
  type SalesforceDataSourceMode,
  getConfiguredOpportunityApiFields,
} from "@/salesforce";

export interface OpportunityDataResult {
  snapshot: OpportunitySnapshot;
  fiscalYear: FiscalYearStartResult;
}

export function useOpportunities(
  mode: SalesforceDataSourceMode,
  configuredFiscalStartMonth: number,
  liveConnected: boolean,
  connectionNonce: number,
) {
  return useQuery({
    queryKey: [
      "opportunities",
      mode,
      configuredFiscalStartMonth,
      connectionNonce,
    ],
    queryFn: async ({ signal }): Promise<OpportunityDataResult> => {
      // Resolve deploy-time field configuration inside the query so a bad map
      // is rendered as a recoverable query error instead of crashing React.
      const dataSource =
        mode === "fixtures"
          ? new FixtureSalesforceDataSource({
              records: FIXTURE_SALESFORCE_RECORDS,
              now: () => new Date(FIXTURE_SYNCED_AT),
            })
          : new LiveSalesforceDataSource({
              fieldMap: getConfiguredOpportunityApiFields(
                process.env.NEXT_PUBLIC_SALESFORCE_FIELD_MAP_JSON,
              ),
            });
      const snapshot = await dataSource.loadOpportunities({ signal });
      const fiscalYear = await dataSource.getFiscalYearStartMonth(
        configuredFiscalStartMonth,
        signal,
      );
      return { snapshot, fiscalYear };
    },
    enabled: mode === "fixtures" || liveConnected,
  });
}
