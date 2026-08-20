"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  Clock3,
  Search,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  checkArrReconciliation,
  evaluateStalledDeal,
  getOpportunityOutcome,
  isWon,
  resolveSegment,
  resolveWonCategory,
  selectArr,
  UNMAPPED_SEGMENT,
} from "@/data";
import { formatCurrency, formatDate } from "@/lib/format";
import { SF_FIELDS } from "@/salesforce/fields";
import type {
  AeSegmentMapping,
  ArrBasis,
  CategoryOverride,
  CategoryResolution,
  Opportunity,
} from "@/types";

interface OpportunityTableProps {
  opportunities: readonly Opportunity[];
  mappings: readonly AeSegmentMapping[];
  overrides: readonly CategoryOverride[];
  arrBasis: ArrBasis;
  stalledDays: number;
  asOf?: Date;
  title?: string;
  description?: string;
  compact?: boolean;
  onOverrideCategory: (
    opportunity: Opportunity,
    resolution: CategoryResolution,
  ) => void;
}

function stageVariant(opportunity: Opportunity) {
  const outcome = getOpportunityOutcome(opportunity);
  if (outcome === "won") return "success" as const;
  if (outcome === "lost-or-disqualified") return "danger" as const;
  return "default" as const;
}

export function OpportunityTable({
  opportunities,
  mappings,
  overrides,
  arrBasis,
  stalledDays,
  asOf,
  title = "Opportunity trace",
  description = "Every row retains its classification, segment source and data caveats.",
  compact = false,
  onOverrideCategory,
}: OpportunityTableProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Opportunity | null>(null);
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matches = query
      ? opportunities.filter((opportunity) =>
          [
            opportunity.name,
            opportunity.ownerName,
            opportunity.leadSalesEngineer,
            opportunity.stage,
          ]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(query)),
        )
      : [...opportunities];
    return compact ? matches.slice(0, 7) : matches;
  }, [compact, opportunities, search]);

  return (
    <>
      <Card data-print-card="true" className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
              <Badge variant="default">{opportunities.length} records</Badge>
            </div>
            <p className="mt-1 text-xs text-slate-500">{description}</p>
          </div>
          {!compact && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                aria-label="Search opportunities"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, owner or SE"
                className="pl-9"
              />
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                <th className="px-5 py-3">Opportunity</th>
                <th className="px-4 py-3">Outcome / presales</th>
                <th className="px-4 py-3">Lead SE</th>
                <th className="px-4 py-3">Resolved segment</th>
                <th className="px-4 py-3">Won category</th>
                <th className="px-4 py-3 text-right">ARR</th>
                <th className="px-4 py-3 text-right">Close</th>
                <th className="w-12 px-4 py-3">
                  <span className="sr-only">Open details</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((opportunity) => {
                const segment = resolveSegment(opportunity, mappings);
                const category = resolveWonCategory(opportunity, overrides);
                const reconciliation = checkArrReconciliation(opportunity);
                const stalled = evaluateStalledDeal(opportunity, {
                  thresholdDays: stalledDays,
                  asOf,
                });
                const amount = selectArr(opportunity, arrBasis).amount;
                return (
                  <tr
                    key={opportunity.id}
                    className="group align-middle transition-colors hover:bg-slate-50/75"
                  >
                    <td className="max-w-[260px] px-5 py-4">
                      <button
                        type="button"
                        onClick={() => setSelected(opportunity)}
                        className="block max-w-full text-left focus-visible:rounded focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                      >
                        <span className="block truncate text-sm font-semibold text-slate-800 group-hover:text-indigo-700">
                          {opportunity.name}
                        </span>
                        <span className="mt-1 block truncate text-[11px] text-slate-400">
                          {opportunity.ownerName ?? "No owner"} ·{" "}
                          {opportunity.type ?? "No type"}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant={stageVariant(opportunity)}>
                        {opportunity.stage ?? "No stage"}
                      </Badge>
                      <p className="mt-1.5 text-[11px] text-slate-500">
                        {opportunity.presalesStage ?? "No presales stage"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <UserRound className="size-3.5 text-slate-400" />
                        {opportunity.leadSalesEngineer ?? (
                          <span className="font-medium text-amber-700">
                            Unattached
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-xs font-medium text-slate-700">
                        {segment.segment}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-400">
                        {segment.source.replaceAll("-", " ")}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        disabled={!isWon(opportunity)}
                        onClick={() =>
                          onOverrideCategory(opportunity, category)
                        }
                        className="text-left focus-visible:rounded focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none disabled:cursor-default"
                      >
                        <Badge
                          variant={
                            category.source === "override" ? "info" : "default"
                          }
                        >
                          <Sparkles className="size-3" />{" "}
                          {category.source === "override"
                            ? "Override"
                            : "Inferred"}
                          : {category.category}
                        </Badge>
                        {isWon(opportunity) && (
                          <span className="mt-1 block text-[10px] text-indigo-500">
                            Edit audited category
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <p className="text-sm font-semibold text-slate-800 tabular-nums">
                        {formatCurrency(amount)}
                      </p>
                      {reconciliation.isFlagged && (
                        <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-amber-700">
                          <AlertTriangle className="size-3" /> amounts diverge
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right text-xs text-slate-500 tabular-nums">
                      {formatDate(opportunity.closeDate)}
                      {stalled.isStalled && (
                        <span className="mt-1 flex items-center justify-end gap-1 text-[10px] font-medium text-rose-600">
                          <Clock3 className="size-3" />{" "}
                          {stalled.daysSinceActivity}d stalled
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setSelected(opportunity)}
                        aria-label={`View ${opportunity.name}`}
                      >
                        <ArrowUpRight className="size-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {visible.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-12 text-center text-sm text-slate-500"
                  >
                    No opportunities match this visible scope.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <OpportunityDetailDialog
        opportunity={selected}
        mappings={mappings}
        overrides={overrides}
        stalledDays={stalledDays}
        asOf={asOf}
        onOpenChange={(open) => !open && setSelected(null)}
        onOverride={(opportunity, resolution) => {
          setSelected(null);
          onOverrideCategory(opportunity, resolution);
        }}
      />
    </>
  );
}

function OpportunityDetailDialog({
  opportunity,
  mappings,
  overrides,
  stalledDays,
  asOf,
  onOpenChange,
  onOverride,
}: {
  opportunity: Opportunity | null;
  mappings: readonly AeSegmentMapping[];
  overrides: readonly CategoryOverride[];
  stalledDays: number;
  asOf?: Date;
  onOpenChange: (open: boolean) => void;
  onOverride: (
    opportunity: Opportunity,
    resolution: CategoryResolution,
  ) => void;
}) {
  if (!opportunity) return null;
  const segment = resolveSegment(opportunity, mappings);
  const category = resolveWonCategory(opportunity, overrides);
  const reconciliation = checkArrReconciliation(opportunity);
  const stalled = evaluateStalledDeal(opportunity, {
    thresholdDays: stalledDays,
    asOf,
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{opportunity.name}</DialogTitle>
          <DialogDescription>
            Traceable detail from the active Salesforce snapshot. This app never
            writes back to Salesforce.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <Detail label={SF_FIELDS.stage} value={opportunity.stage} />
          <Detail
            label={SF_FIELDS.presalesStage}
            value={opportunity.presalesStage}
          />
          <Detail
            label={SF_FIELDS.leadSalesEngineer}
            value={opportunity.leadSalesEngineer}
          />
          <Detail label={SF_FIELDS.ownerName} value={opportunity.ownerName} />
          <Detail
            label="Resolved segment"
            value={`${segment.segment} · ${segment.source.replaceAll("-", " ")}`}
            warning={
              segment.segment === UNMAPPED_SEGMENT || segment.hasDirectConflict
            }
          />
          <Detail
            label={SF_FIELDS.closeDate}
            value={formatDate(opportunity.closeDate)}
          />
          <Detail
            label={SF_FIELDS.dealSize}
            value={formatCurrency(opportunity.dealSize, false)}
            warning={reconciliation.isFlagged}
          />
          <Detail
            label={SF_FIELDS.netBuArr}
            value={formatCurrency(opportunity.netBuArr, false)}
            warning={reconciliation.isFlagged}
          />
        </div>

        {reconciliation.isFlagged && (
          <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            Amounts are not reconciled within the 1% tolerance. Both source
            values are shown above; no substitution was made.
          </div>
        )}
        {stalled.isStalled && (
          <div className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800">
            <Clock3 className="mt-0.5 size-4 shrink-0" />
            Technical Win or later with no activity or stage change for{" "}
            {stalled.daysSinceActivity} days (threshold: {stalled.thresholdDays}
            ).
          </div>
        )}

        <div className="space-y-3 rounded-xl bg-slate-50 p-4">
          <Detail
            label={SF_FIELDS.businessDrivers}
            value={opportunity.businessDrivers}
            wide
          />
          <Detail
            label={SF_FIELDS.whyDoAnything}
            value={opportunity.whyDoAnything}
            wide
          />
          <Detail
            label={SF_FIELDS.npiUseCase}
            value={opportunity.npiUseCase}
            wide
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
          <div>
            <p className="text-[10px] font-semibold tracking-wider text-indigo-500 uppercase">
              Won category ·{" "}
              {category.source === "override" ? "audited override" : "inferred"}
            </p>
            <p className="mt-1 text-sm font-semibold text-indigo-950">
              {category.category}
            </p>
            {category.source === "override" && (
              <p className="mt-1 text-[11px] text-indigo-600">
                Original inference: {category.inferredCategory}
              </p>
            )}
          </div>
          {isWon(opportunity) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOverride(opportunity, category)}
            >
              Override category
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Detail({
  label,
  value,
  warning = false,
  wide = false,
}: {
  label: string;
  value: string | null;
  warning?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "" : "rounded-xl border border-slate-100 p-3"}>
      <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
        {label}
      </p>
      <p
        className={
          warning
            ? "mt-1 text-sm font-semibold text-amber-700"
            : "mt-1 text-sm text-slate-700"
        }
      >
        {value || "Not populated"}
      </p>
    </div>
  );
}
