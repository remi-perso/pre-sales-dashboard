"use client";

import { AlertTriangle, Layers3, Rows3 } from "lucide-react";

import { OpportunityTable } from "@/components/opportunity-table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { aggregateSegments, getReconciliationFlags } from "@/data";
import { formatCurrency, formatNumber } from "@/lib/format";
import type {
  AeSegmentMapping,
  ArrBasis,
  CategoryOverride,
  CategoryResolution,
  Opportunity,
} from "@/types";

interface OpportunitiesViewProps {
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

export function OpportunitiesView(props: OpportunitiesViewProps) {
  const reconciliationFlags = getReconciliationFlags(props.opportunities);
  const segments = aggregateSegments(
    props.opportunities,
    props.mappings,
    props.arrBasis,
  );
  const unmapped = segments.find((segment) => segment.segment === "Unmapped");

  return (
    <div>
      <div className="mb-6">
        <Badge variant="default">
          <Rows3 className="size-3" /> Record-level trace
        </Badge>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
          Opportunity explorer
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Inspect classifications, field conflicts and segment fallbacks without
          losing any record from the visible total.
        </p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Summary
          icon={<Rows3 className="size-4" />}
          label="Visible records"
          value={formatNumber(props.opportunities.length)}
          caption="After every visible filter"
        />
        <Summary
          icon={<AlertTriangle className="size-4" />}
          label="Amount caveats"
          value={formatNumber(reconciliationFlags.length)}
          caption="Both source amounts stay visible"
          warning
        />
        <Summary
          icon={<Layers3 className="size-4" />}
          label="Unmapped bucket"
          value={`${unmapped?.count ?? 0} · ${formatCurrency(unmapped?.amount ?? 0)}`}
          caption="Included in totals; never silently dropped"
          warning
        />
      </div>

      <OpportunityTable
        {...props}
        title="All visible opportunities"
        description="Click any record for source values and trust details · categories are labelled Inferred or Override on every row"
      />
    </div>
  );
}

function Summary({
  icon,
  label,
  value,
  caption,
  warning = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  caption: string;
  warning?: boolean;
}) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div
        className={
          warning
            ? "grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-700"
            : "grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600"
        }
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 truncate text-lg font-semibold text-slate-900">
          {value}
        </p>
        <p className="truncate text-[10px] text-slate-400">{caption}</p>
      </div>
    </Card>
  );
}
