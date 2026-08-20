"use client";

import { Clock3, Gauge, Info } from "lucide-react";

import { OpportunityTable } from "@/components/opportunity-table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getStalledDeals, isOpen } from "@/data";
import type {
  AeSegmentMapping,
  ArrBasis,
  CategoryOverride,
  CategoryResolution,
  Opportunity,
} from "@/types";

interface RequalificationViewProps {
  opportunities: readonly Opportunity[];
  mappings: readonly AeSegmentMapping[];
  overrides: readonly CategoryOverride[];
  arrBasis: ArrBasis;
  stalledDays: number;
  onStalledDaysChange: (days: number) => void;
  asOf: Date;
  onOverrideCategory: (
    opportunity: Opportunity,
    resolution: CategoryResolution,
  ) => void;
}

export function RequalificationView({
  onStalledDaysChange,
  ...props
}: RequalificationViewProps) {
  const openPipeline = props.opportunities.filter(isOpen);
  const stalled = getStalledDeals(openPipeline, {
    thresholdDays: props.stalledDays,
    asOf: props.asOf,
  });

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="danger">
            <Clock3 className="size-3" /> Re-qualification queue
          </Badge>
          <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
            Deals that need a fresh look
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Open pipeline only. A record appears when its presales stage is
            Technical Win or later and neither activity nor stage has moved
            inside the threshold.
          </p>
        </div>
        <div className="w-44" data-print-hidden="true">
          <Label
            htmlFor="stalled-threshold"
            className="mb-1.5 flex items-center gap-1.5 text-xs"
          >
            <Gauge className="size-3.5" /> Inactivity threshold
          </Label>
          <div className="relative">
            <Input
              id="stalled-threshold"
              type="number"
              min={1}
              max={3650}
              value={props.stalledDays}
              onChange={(event) =>
                onStalledDaysChange(Number(event.target.value))
              }
              className="pr-12"
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-slate-400">
              days
            </span>
          </div>
        </div>
      </div>

      <Card className="mb-6 flex flex-col gap-4 border-rose-100 bg-gradient-to-r from-rose-50 to-white p-5 sm:flex-row sm:items-center">
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-rose-600 shadow-sm">
          <Clock3 className="size-5" />
        </div>
        <div className="flex-1">
          <p className="text-3xl font-semibold tracking-tight text-rose-700">
            {stalled.length}
          </p>
          <p className="text-sm font-medium text-rose-900">
            of {openPipeline.length} open opportunities need re-qualification
          </p>
          <p className="mt-1 text-xs text-rose-600">
            Threshold: {props.stalledDays} days · active amount basis remains
            visible in the table
          </p>
        </div>
        <div className="flex max-w-sm gap-2 rounded-xl bg-white/80 p-3 text-xs leading-5 text-slate-500">
          <Info className="mt-0.5 size-4 shrink-0 text-indigo-500" /> Closed
          opportunities are intentionally outside this operational queue, even
          when their last activity is old.
        </div>
      </Card>

      <OpportunityTable
        {...props}
        opportunities={stalled}
        title="Needs re-qualification"
        description={`Open · Technical Win or later · no activity/stage change for ${props.stalledDays}+ days · denominator: ${openPipeline.length} open records`}
      />
    </div>
  );
}
