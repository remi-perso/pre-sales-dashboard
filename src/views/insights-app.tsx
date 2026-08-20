"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, KeyRound } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

import { CategoryOverrideDialog } from "@/components/category-override-dialog";
import { DashboardFilters } from "@/components/dashboard-filters";
import {
  DashboardShell,
  type DashboardViewId,
} from "@/components/dashboard-shell";
import { ErrorState, LoadingState } from "@/components/data-states";
import { SalesforceConnectionDialog } from "@/components/salesforce-connection-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  applyOpportunityFiltersWithSummary,
  getFiscalPeriod,
  getTechnicalWinCohortFilters,
} from "@/data";
import {
  FIXTURE_AE_SEGMENT_MAPPINGS,
  FIXTURE_CATEGORY_OVERRIDES,
} from "@/fixtures";
import { getSafeSalesforceErrorMessage } from "@/salesforce";
import {
  clearSalesforceSession,
  getDisplayName,
  hasSalesforceCredentials,
  saveDisplayName,
  subscribeToSalesforceSessionChanges,
  subscribeToSalesforceSessionExpiry,
} from "@/state/salesforce-session";
import {
  selectOpportunityFilters,
  useDashboardStore,
} from "@/state/dashboard-store";
import type { CategoryResolution, Opportunity } from "@/types";
import { DataQualityView } from "@/views/data-quality-view";
import { OpportunitiesView } from "@/views/opportunities-view";
import { OverviewView } from "@/views/overview-view";
import { RequalificationView } from "@/views/requalification-view";
import { SettingsView } from "@/views/settings-view";
import { useOpportunities } from "@/views/use-opportunities";
import {
  isDatabaseNotConfigured,
  useAeMappings,
  useCategoryOverrides,
} from "@/views/use-shared-data";

export function InsightsApp() {
  const queryClient = useQueryClient();
  const store = useDashboardStore();
  const opportunityFilters = selectOpportunityFilters(store);
  const isConnected = useSyncExternalStore(
    subscribeToSalesforceSessionChanges,
    hasSalesforceCredentials,
    () => false,
  );
  const displayName = useSyncExternalStore(
    subscribeToSalesforceSessionChanges,
    getDisplayName,
    () => null,
  );
  const [connectionOpen, setConnectionOpen] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [connectionNonce, setConnectionNonce] = useState(0);
  const [overrideTarget, setOverrideTarget] = useState<{
    opportunity: Opportunity;
    resolution: CategoryResolution;
  } | null>(null);

  const opportunitiesQuery = useOpportunities(
    store.dataSourceMode,
    store.fiscalYearStartMonth,
    isConnected,
    connectionNonce,
  );
  const mappingsQuery = useAeMappings();
  const overridesQuery = useCategoryOverrides();

  useEffect(
    () =>
      subscribeToSalesforceSessionExpiry(() => {
        queryClient.removeQueries({ queryKey: ["opportunities"] });
        setOverrideTarget(null);
        setSessionExpired(true);
        setConnectionOpen(true);
      }),
    [queryClient],
  );

  const snapshot = opportunitiesQuery.data?.snapshot;
  const mappings =
    mappingsQuery.data?.mappings ??
    (store.dataSourceMode === "fixtures" ? FIXTURE_AE_SEGMENT_MAPPINGS : []);
  const overrides =
    overridesQuery.data?.overrides ??
    (store.dataSourceMode === "fixtures" ? FIXTURE_CATEGORY_OVERRIDES : []);
  const effectiveFiscalStart =
    opportunitiesQuery.data?.fiscalYear.month ?? store.fiscalYearStartMonth;
  const fiscalSource = opportunitiesQuery.data?.fiscalYear.source;
  const asOf = snapshot ? new Date(snapshot.syncedAt) : new Date();
  const fiscalPeriod = getFiscalPeriod(asOf, effectiveFiscalStart);
  const filterResult = snapshot
    ? applyOpportunityFiltersWithSummary(
        snapshot.opportunities,
        opportunityFilters,
        store.amountBasis,
        { mappings, categoryOverrides: overrides },
      )
    : null;
  const cohortFilterResult = snapshot
    ? applyOpportunityFiltersWithSummary(
        snapshot.opportunities,
        getTechnicalWinCohortFilters(opportunityFilters),
        store.amountBasis,
        { mappings, categoryOverrides: overrides },
      )
    : null;
  const sharedDataUnavailable = Boolean(
    mappingsQuery.error || overridesQuery.error,
  );
  const latestSuccessfulSync = snapshot
    ? new Date(
        Math.max(
          new Date(snapshot.syncedAt).getTime(),
          mappingsQuery.dataUpdatedAt,
          overridesQuery.dataUpdatedAt,
        ),
      )
    : null;

  function changeDataSource(mode: "fixtures" | "live") {
    store.setDataSourceMode(mode);
    if (mode === "live" && !isConnected) {
      setSessionExpired(false);
      setConnectionOpen(true);
    }
  }

  function openOverride(
    opportunity: Opportunity,
    resolution: CategoryResolution,
  ) {
    setOverrideTarget({ opportunity, resolution });
  }

  function logout() {
    clearSalesforceSession();
    queryClient.removeQueries({ queryKey: ["opportunities"] });
    setOverrideTarget(null);
    store.setDataSourceMode("fixtures");
    setSessionExpired(false);
  }

  function renderCurrentView(
    opportunities: readonly Opportunity[],
    cohortOpportunities: readonly Opportunity[],
  ) {
    const common = {
      opportunities,
      mappings,
      overrides,
      arrBasis: store.amountBasis,
      stalledDays: store.stalledDays,
      asOf,
      onOverrideCategory: openOverride,
    };

    switch (store.currentView) {
      case "overview":
        return (
          <OverviewView
            {...common}
            cohortOpportunities={cohortOpportunities}
            attachScope={store.attachRateScope}
            fiscalYearStartMonth={effectiveFiscalStart}
            techWinNumerator={store.techWinNumerator}
            techWinDenominator={store.techWinDenominator}
            onOpenOpportunities={() => store.setCurrentView("opportunities")}
            onOpenRequalification={() =>
              store.setCurrentView("requalification")
            }
          />
        );
      case "opportunities":
        return <OpportunitiesView {...common} />;
      case "requalification":
        return (
          <RequalificationView
            {...common}
            onStalledDaysChange={store.setStalledDays}
          />
        );
      case "data-quality":
        return <DataQualityView {...common} />;
      case "settings":
        return (
          <SettingsView
            dataSourceMode={store.dataSourceMode}
            isConnected={isConnected}
            displayName={displayName}
            fiscalYearStartMonth={store.fiscalYearStartMonth}
            stalledDays={store.stalledDays}
            techWinNumerator={store.techWinNumerator}
            techWinDenominator={store.techWinDenominator}
            onOpenConnection={() => {
              setSessionExpired(false);
              setConnectionOpen(true);
            }}
            onLogout={logout}
            onDisplayNameChange={saveDisplayName}
            onFiscalYearStartMonthChange={store.setFiscalYearStartMonth}
            onStalledDaysChange={store.setStalledDays}
            onTechWinNumeratorChange={store.setTechWinNumerator}
            onTechWinDenominatorChange={store.setTechWinDenominator}
          />
        );
    }
  }

  const connectionLabel =
    store.dataSourceMode === "fixtures"
      ? "Fixture mode"
      : isConnected
        ? "Live Salesforce"
        : "Live · session required";

  return (
    <DashboardShell
      activeView={store.currentView as DashboardViewId}
      onViewChange={(view) => store.setCurrentView(view)}
      connectionLabel={connectionLabel}
      isLive={store.dataSourceMode === "live" && isConnected}
    >
      <DashboardFilters
        dataSourceMode={store.dataSourceMode}
        onDataSourceModeChange={changeDataSource}
        attachScope={store.attachRateScope}
        onAttachScopeChange={store.setAttachRateScope}
        arrBasis={store.amountBasis}
        onArrBasisChange={store.setAmountBasis}
        excludeZeroSplitAmount={store.filters.excludeZeroSplitAmount}
        onExcludeZeroSplitAmountChange={store.setExcludeZeroSplitAmount}
        excludedCount={filterResult?.zeroSplitExclusion.count ?? 0}
        excludedAmount={filterResult?.zeroSplitExclusion.amount ?? 0}
        fiscalPeriodLabel={`${fiscalPeriod.label} · ${fiscalSource === "salesforce-organization" ? "Org calendar" : "Configured calendar"}`}
        lastSyncedAt={latestSuccessfulSync}
        isRefreshing={
          opportunitiesQuery.isFetching ||
          mappingsQuery.isFetching ||
          overridesQuery.isFetching
        }
        onRefresh={() => {
          if (store.dataSourceMode === "live" && !isConnected) {
            setConnectionOpen(true);
            return;
          }
          void Promise.all([
            opportunitiesQuery.refetch(),
            mappingsQuery.refetch(),
            overridesQuery.refetch(),
          ]);
        }}
      />

      {sharedDataUnavailable && (
        <Card className="mb-6 flex flex-col gap-3 border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center">
          <AlertTriangle className="size-5 shrink-0 text-amber-700" />
          <p className="flex-1 text-xs leading-5 text-amber-900">
            Shared AE mappings and category overrides are unavailable.
            Opportunities remain visible; unresolved records stay in Unmapped.{" "}
            {isDatabaseNotConfigured(
              mappingsQuery.error ?? overridesQuery.error,
            )
              ? "Configure DATABASE_URL and apply the Prisma migration to enable shared writes."
              : "Try refreshing the shared data from Settings."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => store.setCurrentView("settings")}
          >
            Open settings
          </Button>
        </Card>
      )}

      {store.dataSourceMode === "live" && !isConnected ? (
        <Card className="mx-auto mt-14 max-w-xl p-8 text-center">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
            <KeyRound className="size-5" />
          </div>
          <h2 className="font-semibold text-slate-950">
            A live Salesforce session is required
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Paste your own session ID. It stays in this browser tab and never
            reaches an app API route.
          </p>
          <Button
            variant="accent"
            className="mt-5"
            onClick={() => setConnectionOpen(true)}
          >
            Connect Salesforce
          </Button>
        </Card>
      ) : opportunitiesQuery.error ? (
        <ErrorState
          message={getSafeSalesforceErrorMessage(opportunitiesQuery.error)}
          onRetry={() => void opportunitiesQuery.refetch()}
        />
      ) : opportunitiesQuery.isLoading ||
        !snapshot ||
        !filterResult ||
        !cohortFilterResult ? (
        <LoadingState
          label={
            store.dataSourceMode === "live"
              ? "Loading live Salesforce data…"
              : "Loading realistic fixture data…"
          }
        />
      ) : (
        renderCurrentView(
          filterResult.opportunities,
          cohortFilterResult.opportunities,
        )
      )}

      <SalesforceConnectionDialog
        open={connectionOpen}
        expired={sessionExpired}
        onOpenChange={setConnectionOpen}
        onConnected={() => {
          setConnectionNonce((value) => value + 1);
          setSessionExpired(false);
          store.setDataSourceMode("live");
        }}
      />

      <CategoryOverrideDialog
        key={overrideTarget?.opportunity.id ?? "no-override-target"}
        opportunity={overrideTarget?.opportunity ?? null}
        resolution={overrideTarget?.resolution ?? null}
        changedBy={displayName}
        open={Boolean(overrideTarget)}
        onOpenChange={(open) => !open && setOverrideTarget(null)}
        onNeedsIdentity={() => {
          setOverrideTarget(null);
          store.setCurrentView("settings");
        }}
      />
    </DashboardShell>
  );
}
