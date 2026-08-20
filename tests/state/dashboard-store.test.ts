import {
  DEFAULT_DASHBOARD_PREFERENCES,
  PRODUCT_LINE_OPTIONS,
  REGION_OPTIONS,
  selectOpportunityFilters,
  useDashboardStore,
} from "@/state/dashboard-store";
import { beforeEach, describe, expect, it } from "vitest";

describe("dashboard UI state", () => {
  beforeEach(() => {
    useDashboardStore.getState().resetAll();
  });

  it("scaffolds unavailable dimensions visibly while selecting Phase 1 data", () => {
    expect(PRODUCT_LINE_OPTIONS).toEqual([
      { value: "Okta", label: "Okta", available: true },
      { value: "Auth0", label: "Auth0", available: false },
    ]);
    expect(REGION_OPTIONS).toEqual([
      { value: "UKI", label: "UKI", available: true },
      { value: "Rest of EMEA", label: "Rest of EMEA", available: false },
    ]);

    const state = useDashboardStore.getState();
    expect(state.filters.productLines).toEqual(["Okta"]);
    expect(state.filters.regions).toEqual(["UKI"]);
  });

  it("does not activate a currently unavailable dimension", () => {
    useDashboardStore.getState().setProductLines(["Okta", "Auth0"]);
    useDashboardStore.getState().setRegions(["UKI", "Rest of EMEA"]);

    expect(useDashboardStore.getState().filters.productLines).toEqual(["Okta"]);
    expect(useDashboardStore.getState().filters.regions).toEqual(["UKI"]);
  });

  it("keeps metric scope and independent Tech Win cohorts configurable", () => {
    const store = useDashboardStore.getState();
    store.setAttachRateScope("open-pipeline");
    store.setTechWinNumerator("closed-won");
    store.setTechWinDenominator("presales-engaged");
    store.setAmountBasis("dealSize");
    store.setStalledDays(90);
    store.setFiscalYearStartMonth(4);
    store.setExcludeZeroSplitAmount(true);
    store.setSegments(["Enterprise", "Unmapped"]);

    const updated = useDashboardStore.getState();
    expect(updated).toMatchObject({
      attachRateScope: "open-pipeline",
      techWinNumerator: "closed-won",
      techWinDenominator: "presales-engaged",
      amountBasis: "dealSize",
      stalledDays: 90,
      fiscalYearStartMonth: 4,
    });
    expect(selectOpportunityFilters(updated)).toMatchObject({
      excludeZeroSplitAmount: true,
      segments: ["Enterprise", "Unmapped"],
    });
  });

  it("resets non-persistent UI state to explicit defaults", () => {
    useDashboardStore.getState().setDataSourceMode("live");
    useDashboardStore.getState().setCurrentView("settings");
    useDashboardStore.getState().setStalledDays(0);
    expect(useDashboardStore.getState().stalledDays).toBe(1);

    useDashboardStore.getState().resetAll();

    expect(useDashboardStore.getState()).toMatchObject(
      DEFAULT_DASHBOARD_PREFERENCES,
    );
  });
});
