"use client";

import {
  AlertTriangle,
  DatabaseZap,
  ShieldCheck,
  UserRoundX,
} from "lucide-react";

import { OpportunityTable } from "@/components/opportunity-table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { calculateDataQuality, getReconciliationFlags } from "@/data";
import { formatNumber, formatPercent } from "@/lib/format";
import { SF_FIELDS } from "@/salesforce/fields";
import type {
  AeSegmentMapping,
  ArrBasis,
  CategoryOverride,
  CategoryResolution,
  Opportunity,
} from "@/types";

interface DataQualityViewProps {
  opportunities: readonly Opportunity[];
  mappings: readonly AeSegmentMapping[];
  overrides: readonly CategoryOverride[];
  arrBasis: ArrBasis;
  stalledDays: number;
  asOf: Date;
  onOverrideCategory: (
    opportunity: Opportunity,
    resolution: CategoryResolution,
  ) => void;
}

export function DataQualityView(props: DataQualityViewProps) {
  const summary = calculateDataQuality(props.opportunities, props.mappings);
  const amountFlags = getReconciliationFlags(props.opportunities);

  return (
    <div>
      <div className="mb-6">
        <Badge variant="success">
          <ShieldCheck className="size-3" /> Trust centre
        </Badge>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
          Data quality is part of the answer
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Null rates use the current filtered population. A sparse view is never
          presented as equally trustworthy as a complete one.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <QualityMetric
          icon={<UserRoundX className="size-5" />}
          label={`${SF_FIELDS.leadSalesEngineer} missing`}
          count={summary.leadSalesEngineer.nullCount}
          total={summary.leadSalesEngineer.totalCount}
          rate={summary.leadSalesEngineer.nullRate}
        />
        <QualityMetric
          icon={<DatabaseZap className="size-5" />}
          label="Both direct segment fields missing"
          count={summary.segment.nullCount}
          total={summary.segment.totalCount}
          rate={summary.segment.nullRate}
        />
        <QualityMetric
          icon={<DatabaseZap className="size-5" />}
          label="Still Unmapped after AE fallback"
          count={summary.unmappedSegment.nullCount}
          total={summary.unmappedSegment.totalCount}
          rate={summary.unmappedSegment.nullRate}
        />
        <QualityMetric
          icon={<AlertTriangle className="size-5" />}
          label={`${SF_FIELDS.businessDrivers} missing`}
          count={summary.businessDrivers.nullCount}
          total={summary.businessDrivers.totalCount}
          rate={summary.businessDrivers.nullRate}
        />
      </div>

      <div className="my-6 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700">
              <AlertTriangle className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Amount reconciliation
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {formatNumber(amountFlags.length)} of{" "}
                {formatNumber(summary.totalCount)} records have a missing amount
                or diverge beyond max($1, 1%). Metrics use the selected basis
                explicitly and never substitute the other field.
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
              <ShieldCheck className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Denominator
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Every card above is measured against exactly{" "}
                {formatNumber(summary.totalCount)} records in the current scope,
                after the visible zero-split toggle.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <OpportunityTable
        {...props}
        opportunities={amountFlags.map(({ opportunity }) => opportunity)}
        title="Amount caveats"
        description="Flagged when source amounts diverge beyond tolerance or either value is missing; both values are visible in record detail"
      />
    </div>
  );
}

function QualityMetric({
  icon,
  label,
  count,
  total,
  rate,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  total: number;
  rate: number | null;
}) {
  return (
    <Card className="p-5">
      <div className="mb-5 flex items-start justify-between">
        <div className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
          {icon}
        </div>
        <Badge variant="default">Null rate</Badge>
      </div>
      <p className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
        {formatPercent(rate)}
      </p>
      <p className="mt-1 text-xs font-medium text-slate-600">{label}</p>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full origin-left rounded-full bg-indigo-500"
          style={{ transform: `scaleX(${rate ?? 0})` }}
        />
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        Visible denominator: {count} missing / {total} records
      </p>
    </Card>
  );
}
