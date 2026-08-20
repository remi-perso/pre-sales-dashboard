"use client";

import {
  ArrowRight,
  BriefcaseBusiness,
  CircleDollarSign,
  Download,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  UserRoundCheck,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { MetricCard } from "@/components/metric-card";
import { OpportunityTable } from "@/components/opportunity-table";
import { TrendChart } from "@/components/trend-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  aggregateFiscalTrend,
  aggregateSegments,
  aggregateWonCategories,
  calculateAttachRate,
  calculateDataQuality,
  calculateTechnicalWinArr,
  calculateTechnicalWinToWonCohort,
  calculateTechWinRate,
  calculateYoYComparison,
  describeArrBasis,
  getFiscalPeriod,
  getFiscalQuarterRange,
  getReconciliationFlags,
  getStalledDeals,
  getTechWinCohortPredicate,
  isOpen,
  isWon,
} from "@/data";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { SF_FIELDS } from "@/salesforce/fields";
import type {
  AeSegmentMapping,
  ArrBasis,
  AttachRateScope,
  CategoryOverride,
  CategoryResolution,
  Opportunity,
  TechWinCohortId,
} from "@/types";

const CATEGORY_COLOURS = [
  "#4f46e5",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#cbd5e1",
];

interface OverviewViewProps {
  opportunities: readonly Opportunity[];
  cohortOpportunities: readonly Opportunity[];
  mappings: readonly AeSegmentMapping[];
  overrides: readonly CategoryOverride[];
  arrBasis: ArrBasis;
  attachScope: AttachRateScope;
  stalledDays: number;
  fiscalYearStartMonth: number;
  techWinNumerator: TechWinCohortId;
  techWinDenominator: TechWinCohortId;
  asOf: Date;
  onOpenOpportunities: () => void;
  onOpenRequalification: () => void;
  onOverrideCategory: (
    opportunity: Opportunity,
    resolution: CategoryResolution,
  ) => void;
}

const COHORT_LABELS: Record<TechWinCohortId, string> = {
  "technical-win-or-later": "Technical Win or later",
  "closed-won": "Closed Won",
  "all-closed": "All closed",
  "open-pipeline": "Open pipeline",
  "presales-engaged": "Presales engaged",
  "all-opportunities": "All filtered opportunities",
};

const SCOPE_LABELS: Record<AttachRateScope, string> = {
  won: "Won only",
  "lost-disqualified": "Lost + disqualified",
  "all-closed": "All closed",
  "open-pipeline": "Open pipeline",
  all: "All opportunities",
};

export function OverviewView({
  opportunities,
  cohortOpportunities,
  mappings,
  overrides,
  arrBasis,
  attachScope,
  stalledDays,
  fiscalYearStartMonth,
  techWinNumerator,
  techWinDenominator,
  asOf,
  onOpenOpportunities,
  onOpenRequalification,
  onOverrideCategory,
}: OverviewViewProps) {
  const period = getFiscalPeriod(asOf, fiscalYearStartMonth);
  const cohortRange = getFiscalQuarterRange(
    period.fiscalYear,
    period.quarter,
    fiscalYearStartMonth,
  );
  const attach = calculateAttachRate(opportunities, attachScope, arrBasis);
  const technicalWinArr = calculateTechnicalWinArr(opportunities, arrBasis);
  const techWinRate = calculateTechWinRate(opportunities, {
    numeratorPredicate: getTechWinCohortPredicate(techWinNumerator),
    denominatorPredicate: getTechWinCohortPredicate(techWinDenominator),
    arrBasis,
  });
  const cohortConversion = calculateTechnicalWinToWonCohort(
    cohortOpportunities,
    {
      cohortPeriod: cohortRange,
      arrBasis,
    },
  );
  const yoy = calculateYoYComparison(cohortOpportunities, {
    period,
    fiscalYearStartMonth,
    arrBasis,
    predicate: isWon,
  });
  const wonOpportunities = opportunities.filter(isWon);
  const wonTrendOpportunities = cohortOpportunities.filter(isWon);
  const trend = aggregateFiscalTrend(wonTrendOpportunities, {
    fiscalYearStartMonth,
    arrBasis,
  });
  const categories = aggregateWonCategories(
    opportunities,
    overrides,
    arrBasis,
  ).filter((item) => item.count > 0);
  const segments = aggregateSegments(opportunities, mappings, arrBasis);
  const quality = calculateDataQuality(opportunities, mappings);
  const reconciliationFlags = getReconciliationFlags(opportunities);
  const stalled = getStalledDeals(opportunities.filter(isOpen), {
    thresholdDays: stalledDays,
    asOf,
  });
  const arrLabel = describeArrBasis(arrBasis);

  return (
    <div>
      <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="info">
              <Sparkles className="size-3" /> Leadership snapshot
            </Badge>
            <span className="text-xs text-slate-400">
              {period.label} YoY lens · {formatNumber(opportunities.length)} in
              active scope
            </span>
          </div>
          <h1 className="max-w-3xl text-2xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-3xl">
            Technical outcomes, without the spreadsheet caveats.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Every total keeps its scope, denominator, amount basis and trust
            signal attached.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => window.print()}
          data-print-hidden="true"
        >
          <Download className="size-4" /> Print / save PDF
        </Button>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="SE attach rate"
          value={formatPercent(attach.amountRate)}
          secondaryValue={`${formatPercent(attach.countRate)} count`}
          icon={<UserRoundCheck className="size-5" />}
          accent="indigo"
          caption={
            <>
              {SCOPE_LABELS[attachScope]} · {arrLabel}:{" "}
              {formatCurrency(attach.numerator.amount)} /{" "}
              {formatCurrency(attach.denominator.amount)} · count:{" "}
              {attach.numerator.count} / {attach.denominator.count}
            </>
          }
        />
        <MetricCard
          label="Technical Win ARR"
          value={formatCurrency(technicalWinArr.amount)}
          secondaryValue={`${technicalWinArr.count} deals`}
          icon={<Trophy className="size-5" />}
          accent="emerald"
          caption={
            <>
              {SF_FIELDS.presalesStage} = Technical Win or later · all active
              filtered records · {arrLabel} basis
            </>
          }
        />
        <MetricCard
          label="Tech Win rate ($)"
          value={formatPercent(techWinRate.amountRate)}
          secondaryValue={`${formatPercent(techWinRate.countRate)} count`}
          icon={<Target className="size-5" />}
          accent="amber"
          caption={
            <>
              Numerator: {COHORT_LABELS[techWinNumerator]} (
              {formatCurrency(techWinRate.numerator.amount)};{" "}
              {techWinRate.numerator.count} records) · denominator:{" "}
              {COHORT_LABELS[techWinDenominator]} (
              {formatCurrency(techWinRate.denominator.amount)};{" "}
              {techWinRate.denominator.count} records) · provisional,
              configurable · {arrLabel}
            </>
          }
        />
        <MetricCard
          label="Tech Win → Closed Won"
          value={formatPercent(cohortConversion.amountRate)}
          secondaryValue={`${formatPercent(cohortConversion.countRate)} count`}
          icon={<CircleDollarSign className="size-5" />}
          accent="rose"
          caption={
            <>
              Cohort: Technical Win reached in {period.label} (
              {cohortConversion.numerator.count}/
              {cohortConversion.denominator.count} records;{" "}
              {formatCurrency(cohortConversion.numerator.amount)}/
              {formatCurrency(cohortConversion.denominator.amount)} {arrLabel});
              dashboard date filters do not remove later wins
            </>
          }
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_0.8fr]">
        <Card data-print-card="true">
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>Closed-Won fiscal trend</CardTitle>
              <CardDescription>
                {yoy.currentPeriod.label}: {formatCurrency(yoy.current.amount)}{" "}
                ({yoy.current.count}) vs {yoy.priorPeriod.label}:{" "}
                {formatCurrency(yoy.prior.amount)} ({yoy.prior.count}) · same
                fiscal quarter · {arrLabel}
              </CardDescription>
            </div>
            <Badge
              variant={
                yoy.amountPercentChange == null
                  ? "default"
                  : yoy.amountPercentChange >= 0
                    ? "success"
                    : "danger"
              }
            >
              {yoy.amountPercentChange == null
                ? "No YoY baseline"
                : `${yoy.amountPercentChange >= 0 ? "+" : ""}${(yoy.amountPercentChange * 100).toFixed(1)}% YoY`}
            </Badge>
          </CardHeader>
          <CardContent>
            <TrendChart points={trend} />
          </CardContent>
        </Card>

        <Card data-print-card="true">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Won category mix</CardTitle>
                <CardDescription>
                  Keyword-derived classification with audited overrides
                </CardDescription>
              </div>
              <Badge variant="info">
                <Sparkles className="size-3" /> Inferred
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid items-center gap-4 sm:grid-cols-[160px_1fr] xl:grid-cols-1 2xl:grid-cols-[160px_1fr]">
              <div className="relative mx-auto size-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categories}
                      dataKey="amount"
                      nameKey="category"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={3}
                      stroke="none"
                      isAnimationActive={false}
                    >
                      {categories.map((item, index) => (
                        <Cell
                          key={item.category}
                          fill={
                            CATEGORY_COLOURS[index % CATEGORY_COLOURS.length]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value))}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                  <div>
                    <p className="text-[10px] tracking-wider text-slate-400 uppercase">
                      Won cohort
                    </p>
                    <p className="text-sm font-semibold text-slate-800">
                      {wonOpportunities.length} deals
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-2.5">
                {categories.map((item, index) => (
                  <div
                    key={item.category}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          CATEGORY_COLOURS[index % CATEGORY_COLOURS.length],
                      }}
                    />
                    <span className="min-w-0 flex-1 truncate text-slate-600">
                      {item.category}
                    </span>
                    <span className="font-semibold text-slate-800 tabular-nums">
                      {formatCurrency(item.amount)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {item.overriddenCount
                        ? `${item.overriddenCount} override`
                        : "Inferred"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card data-print-card="true">
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>Segment coverage</CardTitle>
              <CardDescription>
                Direct fields first, shared AE mapping only as fallback
              </CardDescription>
            </div>
            <BriefcaseBusiness className="size-5 text-slate-300" />
          </CardHeader>
          <CardContent className="space-y-2">
            {segments.map((segment) => (
              <div
                key={segment.segment}
                className={
                  segment.segment === "Unmapped"
                    ? "flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3"
                    : "flex items-center gap-3 rounded-xl border border-slate-100 p-3"
                }
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-slate-700">
                      {segment.segment}
                    </p>
                    {segment.segment === "Unmapped" && (
                      <Badge variant="warning">Never excluded</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {segment.sourceCounts["owner-geo-segment"]} geo ·{" "}
                    {segment.sourceCounts["split-owner-segment"]} split ·{" "}
                    {segment.sourceCounts["ae-mapping"]} mapped
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-800">
                    {formatCurrency(segment.amount)}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {segment.count} records
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card data-print-card="true">
          <CardHeader>
            <CardTitle>Trust snapshot</CardTitle>
            <CardDescription>
              Visible caveats across the current filtered population of{" "}
              {quality.totalCount}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <QualityRow
              label="Lead SE missing"
              count={quality.leadSalesEngineer.nullCount}
              rate={quality.leadSalesEngineer.nullRate}
            />
            <QualityRow
              label="Unmapped after fallback"
              count={quality.unmappedSegment.nullCount}
              rate={quality.unmappedSegment.nullRate}
            />
            <QualityRow
              label={`${SF_FIELDS.businessDrivers} missing`}
              count={quality.businessDrivers.nullCount}
              rate={quality.businessDrivers.nullRate}
            />
            <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={onOpenRequalification}
                className="rounded-xl bg-rose-50 p-3 text-left transition hover:bg-rose-100 focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:outline-none"
              >
                <p className="text-2xl font-semibold text-rose-700">
                  {stalled.length}
                </p>
                <p className="mt-1 text-xs font-medium text-rose-800">
                  Need re-qualification
                </p>
                <p className="mt-1 text-[10px] text-rose-600">
                  Technical Win+ · {stalledDays}d threshold
                </p>
              </button>
              <button
                type="button"
                onClick={onOpenOpportunities}
                className="rounded-xl bg-amber-50 p-3 text-left transition hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none"
              >
                <p className="text-2xl font-semibold text-amber-700">
                  {reconciliationFlags.length}
                </p>
                <p className="mt-1 text-xs font-medium text-amber-800">
                  Amount caveats
                </p>
                <p className="mt-1 text-[10px] text-amber-600">
                  Diverged or missing values
                </p>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <OpportunityTable
          opportunities={opportunities}
          mappings={mappings}
          overrides={overrides}
          arrBasis={arrBasis}
          stalledDays={stalledDays}
          asOf={asOf}
          compact
          title="Active scope trace"
          description={`Top records from the active scope · ${arrLabel} basis · categories explicitly marked inferred or overridden`}
          onOverrideCategory={onOverrideCategory}
        />
        {opportunities.length > 7 && (
          <div className="mt-3 flex justify-end">
            <Button variant="ghost" onClick={onOpenOpportunities}>
              View all {opportunities.length} opportunities{" "}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function QualityRow({
  label,
  count,
  rate,
}: {
  label: string;
  count: number;
  rate: number | null;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
        <span className="flex items-center gap-1.5 font-medium text-slate-600">
          <ShieldCheck className="size-3.5 text-indigo-500" />
          {label}
        </span>
        <span className="text-slate-500 tabular-nums">
          {count} · {formatPercent(rate)}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full origin-left rounded-full bg-indigo-400"
          style={{ transform: `scaleX(${rate ?? 0})` }}
        />
      </div>
    </div>
  );
}
