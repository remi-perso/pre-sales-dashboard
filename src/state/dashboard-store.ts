"use client";

import type { SalesforceDataSourceMode } from "@/salesforce/data-source";
import {
  AVAILABLE_PRODUCT_LINES,
  AVAILABLE_REGIONS,
  PRODUCT_LINES,
  REGIONS,
  type ArrBasis,
  type AttachRateScope,
  type DateRange,
  type OpportunityFilters,
  type ProductLine,
  type Region,
  type TechWinCohortId,
  type WonCategory,
} from "@/types";
import { create } from "zustand";

export type { TechWinCohortId } from "@/types";

export type DashboardView =
  | "overview"
  | "opportunities"
  | "requalification"
  | "data-quality"
  | "settings";

export interface DimensionOption<T extends string> {
  value: T;
  label: string;
  available: boolean;
}

export interface TechWinCohortOption {
  value: TechWinCohortId;
  label: string;
}

export const PRODUCT_LINE_OPTIONS: readonly DimensionOption<ProductLine>[] =
  PRODUCT_LINES.map((value) => ({
    value,
    label: value,
    available: (AVAILABLE_PRODUCT_LINES as readonly ProductLine[]).includes(
      value,
    ),
  }));

export const REGION_OPTIONS: readonly DimensionOption<Region>[] = REGIONS.map(
  (value) => ({
    value,
    label: value,
    available: (AVAILABLE_REGIONS as readonly Region[]).includes(value),
  }),
);

export const TECH_WIN_COHORT_OPTIONS: readonly TechWinCohortOption[] = [
  { value: "technical-win-or-later", label: "Technical Win or later" },
  { value: "closed-won", label: "Closed Won" },
  { value: "all-closed", label: "All closed opportunities" },
  { value: "open-pipeline", label: "Open pipeline" },
  { value: "presales-engaged", label: "Has a presales stage" },
  { value: "all-opportunities", label: "All filtered opportunities" },
];

export interface DashboardFilterState {
  productLines: ProductLine[];
  regions: Region[];
  stages: string[];
  presalesStages: string[];
  segments: string[];
  categories: WonCategory[];
  closeDateRange: DateRange | null;
  createdDateRange: DateRange | null;
  excludeZeroSplitAmount: boolean;
}

export interface DashboardStoreState {
  currentView: DashboardView;
  dataSourceMode: SalesforceDataSourceMode;
  filters: DashboardFilterState;
  attachRateScope: AttachRateScope;
  stalledDays: number;
  fiscalYearStartMonth: number;
  amountBasis: ArrBasis;
  techWinNumerator: TechWinCohortId;
  techWinDenominator: TechWinCohortId;

  setCurrentView: (view: DashboardView) => void;
  setDataSourceMode: (mode: SalesforceDataSourceMode) => void;
  setFilters: (filters: Partial<DashboardFilterState>) => void;
  setProductLines: (productLines: readonly ProductLine[]) => void;
  setRegions: (regions: readonly Region[]) => void;
  setSegments: (segments: readonly string[]) => void;
  setExcludeZeroSplitAmount: (exclude: boolean) => void;
  setAttachRateScope: (scope: AttachRateScope) => void;
  setStalledDays: (days: number) => void;
  setFiscalYearStartMonth: (month: number) => void;
  setAmountBasis: (basis: ArrBasis) => void;
  setTechWinNumerator: (cohort: TechWinCohortId) => void;
  setTechWinDenominator: (cohort: TechWinCohortId) => void;
  resetFilters: () => void;
  resetAll: () => void;
}

export const DEFAULT_DASHBOARD_FILTERS: Readonly<DashboardFilterState> =
  Object.freeze({
    productLines: ["Okta"] as ProductLine[],
    regions: ["UKI"] as Region[],
    stages: [],
    presalesStages: [],
    segments: [],
    categories: [],
    closeDateRange: null,
    createdDateRange: null,
    excludeZeroSplitAmount: false,
  });

export const DEFAULT_DASHBOARD_PREFERENCES = Object.freeze({
  currentView: "overview" as DashboardView,
  dataSourceMode: "fixtures" as SalesforceDataSourceMode,
  attachRateScope: "all-closed" as AttachRateScope,
  stalledDays: 60,
  /** Configurable fallback; live mode replaces it when Organization is queryable. */
  fiscalYearStartMonth: 2,
  amountBasis: "netBuArr" as ArrBasis,
  techWinNumerator: "technical-win-or-later" as TechWinCohortId,
  /** Explicit provisional denominator pending leadership confirmation. */
  techWinDenominator: "all-opportunities" as TechWinCohortId,
});

const availableProductLines = new Set<ProductLine>(AVAILABLE_PRODUCT_LINES);
const availableRegions = new Set<Region>(AVAILABLE_REGIONS);

function freshFilters(): DashboardFilterState {
  return {
    ...DEFAULT_DASHBOARD_FILTERS,
    productLines: [...DEFAULT_DASHBOARD_FILTERS.productLines],
    regions: [...DEFAULT_DASHBOARD_FILTERS.regions],
    stages: [],
    presalesStages: [],
    segments: [],
    categories: [],
  };
}

function normalizeDays(days: number): number {
  if (!Number.isFinite(days)) return 60;
  return Math.min(3_650, Math.max(1, Math.round(days)));
}

function normalizeMonth(month: number): number {
  if (!Number.isFinite(month)) return 2;
  return Math.min(12, Math.max(1, Math.round(month)));
}

function mergeFilters(
  current: DashboardFilterState,
  patch: Partial<DashboardFilterState>,
): DashboardFilterState {
  return {
    ...current,
    ...patch,
    productLines: patch.productLines
      ? patch.productLines.filter((value) => availableProductLines.has(value))
      : current.productLines,
    regions: patch.regions
      ? patch.regions.filter((value) => availableRegions.has(value))
      : current.regions,
    stages: patch.stages ? [...patch.stages] : current.stages,
    presalesStages: patch.presalesStages
      ? [...patch.presalesStages]
      : current.presalesStages,
    segments: patch.segments ? [...patch.segments] : current.segments,
    categories: patch.categories ? [...patch.categories] : current.categories,
  };
}

function initialState() {
  return {
    ...DEFAULT_DASHBOARD_PREFERENCES,
    filters: freshFilters(),
  };
}

export const useDashboardStore = create<DashboardStoreState>((set) => ({
  ...initialState(),

  setCurrentView: (currentView) => set({ currentView }),
  setDataSourceMode: (dataSourceMode) => set({ dataSourceMode }),
  setFilters: (filters) =>
    set((state) => ({ filters: mergeFilters(state.filters, filters) })),
  setProductLines: (productLines) =>
    set((state) => ({
      filters: {
        ...state.filters,
        productLines: productLines.filter((value) =>
          availableProductLines.has(value),
        ),
      },
    })),
  setRegions: (regions) =>
    set((state) => ({
      filters: {
        ...state.filters,
        regions: regions.filter((value) => availableRegions.has(value)),
      },
    })),
  setSegments: (segments) =>
    set((state) => ({
      filters: { ...state.filters, segments: [...segments] },
    })),
  setExcludeZeroSplitAmount: (excludeZeroSplitAmount) =>
    set((state) => ({
      filters: { ...state.filters, excludeZeroSplitAmount },
    })),
  setAttachRateScope: (attachRateScope) => set({ attachRateScope }),
  setStalledDays: (stalledDays) =>
    set({ stalledDays: normalizeDays(stalledDays) }),
  setFiscalYearStartMonth: (fiscalYearStartMonth) =>
    set({ fiscalYearStartMonth: normalizeMonth(fiscalYearStartMonth) }),
  setAmountBasis: (amountBasis) => set({ amountBasis }),
  setTechWinNumerator: (techWinNumerator) => set({ techWinNumerator }),
  setTechWinDenominator: (techWinDenominator) => set({ techWinDenominator }),
  resetFilters: () => set({ filters: freshFilters() }),
  resetAll: () => set(initialState()),
}));

export const selectOpportunityFilters = (
  state: DashboardStoreState,
): OpportunityFilters => ({
  productLines: state.filters.productLines,
  regions: state.filters.regions,
  stages: state.filters.stages,
  presalesStages: state.filters.presalesStages,
  segments: state.filters.segments,
  categories: state.filters.categories,
  closeDateRange: state.filters.closeDateRange,
  createdDateRange: state.filters.createdDateRange,
  excludeZeroSplitAmount: state.filters.excludeZeroSplitAmount,
});

export const selectCurrentView = (state: DashboardStoreState) =>
  state.currentView;
export const selectDataSourceMode = (state: DashboardStoreState) =>
  state.dataSourceMode;
export const selectDashboardFilters = (state: DashboardStoreState) =>
  state.filters;
