"use client";

import {
  CalendarRange,
  Database,
  Filter,
  RefreshCcw,
  SlidersHorizontal,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { SF_FIELDS } from "@/salesforce/fields";
import type { ArrBasis, AttachRateScope } from "@/types";

const ATTACH_LABELS: Record<AttachRateScope, string> = {
  won: "Won only",
  "lost-disqualified": "Lost + disqualified",
  "all-closed": "All closed",
  "open-pipeline": "Open pipeline",
  all: "All opportunities",
};

interface DashboardFiltersProps {
  dataSourceMode: "fixtures" | "live";
  onDataSourceModeChange: (mode: "fixtures" | "live") => void;
  attachScope: AttachRateScope;
  onAttachScopeChange: (scope: AttachRateScope) => void;
  arrBasis: ArrBasis;
  onArrBasisChange: (basis: ArrBasis) => void;
  excludeZeroSplitAmount: boolean;
  onExcludeZeroSplitAmountChange: (excluded: boolean) => void;
  excludedCount: number;
  excludedAmount: number;
  fiscalPeriodLabel: string;
  lastSyncedAt: Date | null;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function DashboardFilters({
  dataSourceMode,
  onDataSourceModeChange,
  attachScope,
  onAttachScopeChange,
  arrBasis,
  onArrBasisChange,
  excludeZeroSplitAmount,
  onExcludeZeroSplitAmountChange,
  excludedCount,
  excludedAmount,
  fiscalPeriodLabel,
  lastSyncedAt,
  isRefreshing,
  onRefresh,
}: DashboardFiltersProps) {
  return (
    <Card data-print-hidden="true" className="mb-6 overflow-visible p-3 sm:p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <div className="mr-1 flex items-center gap-2 px-1 text-xs font-semibold text-slate-500">
            <SlidersHorizontal className="size-4" /> Scope
          </div>
          <div className="w-[148px]">
            <Label className="sr-only">Data source</Label>
            <Select
              value={dataSourceMode}
              onValueChange={(value) =>
                onDataSourceModeChange(value as "fixtures" | "live")
              }
            >
              <SelectTrigger aria-label="Data source">
                <Database className="size-3.5 text-slate-400" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixtures">Fixture data</SelectItem>
                <SelectItem value="live">Live Salesforce</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-[132px]">
            <Select value="Okta">
              <SelectTrigger aria-label="Product line">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Okta">Okta</SelectItem>
                <SelectItem value="Auth0" disabled>
                  Auth0 · Phase 2
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-[132px]">
            <Select value="UKI">
              <SelectTrigger aria-label="Region">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UKI">UK & Ireland</SelectItem>
                <SelectItem value="Rest of EMEA" disabled>
                  Rest of EMEA · Later
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-[155px]">
            <Select
              value={attachScope}
              onValueChange={(value) =>
                onAttachScopeChange(value as AttachRateScope)
              }
            >
              <SelectTrigger aria-label="SE attach scope">
                <Filter className="size-3.5 text-slate-400" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(ATTACH_LABELS) as Array<
                    [AttachRateScope, string]
                  >
                ).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-[145px]">
            <Select
              value={arrBasis}
              onValueChange={(value) => onArrBasisChange(value as ArrBasis)}
            >
              <SelectTrigger aria-label="ARR basis">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="netBuArr">
                  {SF_FIELDS.netBuArr} basis
                </SelectItem>
                <SelectItem value="dealSize">
                  {SF_FIELDS.dealSize} basis
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Badge variant="default" className="h-8 rounded-lg px-3">
            <CalendarRange className="size-3.5" /> {fiscalPeriodLabel}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 xl:justify-end xl:border-t-0 xl:border-l xl:pt-0 xl:pl-4">
          <div className="flex items-center gap-2.5">
            <Switch
              id="exclude-zero-split"
              checked={excludeZeroSplitAmount}
              onCheckedChange={onExcludeZeroSplitAmountChange}
            />
            <Label
              htmlFor="exclude-zero-split"
              className="cursor-pointer text-xs"
            >
              Exclude zero split
              <span className="ml-1 font-normal text-slate-400">
                ({excludedCount} · {formatCurrency(excludedAmount)})
              </span>
            </Label>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
              Last synced
            </p>
            <p className="text-xs font-medium text-slate-600">
              {formatDateTime(lastSyncedAt)}
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Refresh data"
          >
            <RefreshCcw
              className={isRefreshing ? "size-4 animate-spin" : "size-4"}
            />
          </Button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3 sm:hidden">
        <Badge variant="default">Auth0 · unavailable</Badge>
        <Badge variant="default">Rest of EMEA · unavailable</Badge>
      </div>
    </Card>
  );
}

export { ATTACH_LABELS };
