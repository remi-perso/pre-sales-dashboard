"use client";

import {
  AlertTriangle,
  Check,
  Database,
  History,
  KeyRound,
  LockKeyhole,
  RefreshCcw,
  Save,
  Settings2,
  UserRound,
} from "lucide-react";
import { FormEvent, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime } from "@/lib/format";
import {
  PRODUCT_LINE_OPTIONS,
  REGION_OPTIONS,
  TECH_WIN_COHORT_OPTIONS,
} from "@/state/dashboard-store";
import type { TechWinCohortId } from "@/types";
import {
  isDatabaseNotConfigured,
  sharedDataErrorMessage,
  useAeMappings,
  useCategoryOverrides,
  useSaveAeMapping,
} from "@/views/use-shared-data";

interface SettingsViewProps {
  dataSourceMode: "fixtures" | "live";
  isConnected: boolean;
  displayName: string | null;
  fiscalYearStartMonth: number;
  stalledDays: number;
  techWinNumerator: TechWinCohortId;
  techWinDenominator: TechWinCohortId;
  onOpenConnection: () => void;
  onLogout: () => void;
  onDisplayNameChange: (name: string) => void;
  onFiscalYearStartMonthChange: (month: number) => void;
  onStalledDaysChange: (days: number) => void;
  onTechWinNumeratorChange: (value: TechWinCohortId) => void;
  onTechWinDenominatorChange: (value: TechWinCohortId) => void;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function SettingsView(props: SettingsViewProps) {
  const mappingsQuery = useAeMappings();
  const overridesQuery = useCategoryOverrides();
  const saveMapping = useSaveAeMapping();
  const [identity, setIdentity] = useState(props.displayName ?? "");
  const [aeName, setAeName] = useState("");
  const [segment, setSegment] = useState("");
  const [mappingReason, setMappingReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const sharedDataUpdatedAt = Math.max(
    mappingsQuery.dataUpdatedAt,
    overridesQuery.dataUpdatedAt,
  );

  async function submitMapping(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!props.displayName) {
      setFormError(
        "Save a self-reported display name before changing shared mappings.",
      );
      return;
    }
    try {
      await saveMapping.mutateAsync({
        aeName,
        segment,
        reason: mappingReason || undefined,
        changedBy: props.displayName,
      });
      setAeName("");
      setSegment("");
      setMappingReason("");
    } catch {
      // The mutation error is rendered below without exposing request internals.
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Badge variant="default">
          <Settings2 className="size-3" /> Configuration
        </Badge>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
          Settings & shared mappings
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Salesforce credentials remain tab-local. Mapping and category audit
          data lives in the shared PostgreSQL database.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Salesforce connection</CardTitle>
                <CardDescription>
                  Direct from this browser; never proxied through app APIs
                </CardDescription>
              </div>
              <Badge variant={props.isConnected ? "success" : "warning"}>
                {props.isConnected ? "Connected in this tab" : "Not connected"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-xs leading-5 text-emerald-900">
              <LockKeyhole className="mt-0.5 size-4 shrink-0" />
              <span>
                The session ID is held only in <strong>sessionStorage</strong>,
                cleared on logout, expiry or tab close, and sent only to your
                Salesforce instance as a Bearer header.
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="accent" onClick={props.onOpenConnection}>
                <KeyRound className="size-4" />{" "}
                {props.isConnected
                  ? "Replace session ID"
                  : "Connect live Salesforce"}
              </Button>
              {props.isConnected && (
                <Button variant="danger" onClick={props.onLogout}>
                  Clear session & logout
                </Button>
              )}
            </div>
            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs font-semibold text-slate-700">
                One-time Salesforce CORS setup
              </p>
              <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs leading-5 text-slate-500">
                <li>Open Salesforce Setup → CORS.</li>
                <li>Add this dashboard’s exact origin, including HTTPS.</li>
                <li>
                  Ask an org admin if CORS settings are not visible to you.
                </li>
              </ol>
              <p className="mt-2 flex items-center gap-1 text-[11px] text-amber-700">
                <AlertTriangle className="size-3" /> Feasibility and the org’s
                custom API field names still require admin verification.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Session identity</CardTitle>
            <CardDescription>
              Self-reported attribution for every shared change; not a verified
              login
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="settings-display-name">Display name</Label>
              <div className="flex gap-2">
                <Input
                  id="settings-display-name"
                  value={identity}
                  onChange={(event) => setIdentity(event.target.value)}
                  placeholder="e.g. Remi P."
                  autoComplete="off"
                />
                <Button
                  variant="outline"
                  onClick={() => props.onDisplayNameChange(identity)}
                  disabled={!identity.trim()}
                >
                  <Save className="size-4" /> Save in tab
                </Button>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl bg-slate-50 p-3">
              <UserRound className="mt-0.5 size-4 shrink-0 text-slate-500" />
              <div>
                <p className="text-xs font-medium text-slate-700">
                  Current attribution
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {props.displayName
                    ? `“${props.displayName}” · self-reported`
                    : "No display name saved for this tab."}
                </p>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs font-semibold text-slate-700">
                Data source now
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {props.dataSourceMode === "fixtures"
                  ? "Realistic local fixtures; no Salesforce token required."
                  : "Live read-only Opportunity queries from this browser."}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metric definitions</CardTitle>
            <CardDescription>
              Make unconfirmed assumptions configurable and visible
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="tech-win-numerator">
                  Tech Win Rate numerator
                </Label>
                <Select
                  value={props.techWinNumerator}
                  onValueChange={(value) =>
                    props.onTechWinNumeratorChange(value as TechWinCohortId)
                  }
                >
                  <SelectTrigger id="tech-win-numerator">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TECH_WIN_COHORT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tech-win-denominator">
                  Tech Win Rate denominator
                </Label>
                <Select
                  value={props.techWinDenominator}
                  onValueChange={(value) =>
                    props.onTechWinDenominatorChange(value as TechWinCohortId)
                  }
                >
                  <SelectTrigger id="tech-win-denominator">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TECH_WIN_COHORT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" /> Leadership’s
              official Tech Win Rate ($) denominator is unconfirmed. These two
              cohorts stay independent and the active choices render beside the
              metric.
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="fiscal-year-start">Fiscal year starts</Label>
                <Select
                  value={String(props.fiscalYearStartMonth)}
                  onValueChange={(value) =>
                    props.onFiscalYearStartMonthChange(Number(value))
                  }
                >
                  <SelectTrigger id="fiscal-year-start">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month, index) => (
                      <SelectItem key={month} value={String(index + 1)}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-400">
                  Fallback only; live mode uses Organization settings when
                  queryable.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="settings-stalled-days">
                  Stalled threshold (days)
                </Label>
                <Input
                  id="settings-stalled-days"
                  type="number"
                  min={1}
                  max={3650}
                  value={props.stalledDays}
                  onChange={(event) =>
                    props.onStalledDaysChange(Number(event.target.value))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Phase-ready dimensions</CardTitle>
            <CardDescription>
              Unavailable options remain visible, disabled and structurally
              first-class
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <DimensionOptions
              title="Product line"
              options={PRODUCT_LINE_OPTIONS}
            />
            <DimensionOptions title="Region" options={REGION_OPTIONS} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Shared AE → segment fallback</CardTitle>
                <CardDescription>
                  Used only when both direct Salesforce segment fields are null
                </CardDescription>
              </div>
              <div className="text-right">
                <Badge variant={mappingsQuery.error ? "warning" : "success"}>
                  <Database className="size-3" />{" "}
                  {mappingsQuery.error ? "DB unavailable" : "PostgreSQL shared"}
                </Badge>
                <p className="mt-1 text-[10px] text-slate-400">
                  Last read{" "}
                  {formatDateTime(
                    sharedDataUpdatedAt ? new Date(sharedDataUpdatedAt) : null,
                  )}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void mappingsQuery.refetch();
                void overridesQuery.refetch();
              }}
              disabled={mappingsQuery.isFetching || overridesQuery.isFetching}
            >
              <RefreshCcw
                className={
                  mappingsQuery.isFetching || overridesQuery.isFetching
                    ? "size-3.5 animate-spin"
                    : "size-3.5"
                }
              />
              Refresh shared data
            </Button>
          </CardHeader>
          <CardContent>
            {mappingsQuery.error && (
              <DatabaseNotice error={mappingsQuery.error} />
            )}
            <form
              onSubmit={submitMapping}
              className="mb-5 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2"
            >
              <div className="space-y-1.5">
                <Label htmlFor="mapping-ae">AE / Opportunity owner</Label>
                <Input
                  id="mapping-ae"
                  value={aeName}
                  onChange={(event) => setAeName(event.target.value)}
                  placeholder="Exact Salesforce owner name"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mapping-segment">Fallback segment</Label>
                <Input
                  id="mapping-segment"
                  value={segment}
                  onChange={(event) => setSegment(event.target.value)}
                  placeholder="e.g. Enterprise-1"
                  required
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="mapping-reason">Reason (optional)</Label>
                <Input
                  id="mapping-reason"
                  value={mappingReason}
                  onChange={(event) => setMappingReason(event.target.value)}
                  placeholder="Why is this mapping needed?"
                />
              </div>
              {(formError || saveMapping.error) && (
                <p role="alert" className="text-xs text-rose-700 sm:col-span-2">
                  {formError ?? saveMapping.error?.message}
                </p>
              )}
              <div className="flex items-center justify-between gap-3 sm:col-span-2">
                <p className="text-[11px] text-slate-400">
                  Saved as{" "}
                  {props.displayName
                    ? `“${props.displayName}” (self-reported)`
                    : "no identity yet"}
                </p>
                <Button
                  type="submit"
                  variant="accent"
                  size="sm"
                  disabled={
                    saveMapping.isPending || Boolean(mappingsQuery.error)
                  }
                >
                  {saveMapping.isPending ? "Saving…" : "Save shared mapping"}
                </Button>
              </div>
            </form>

            <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
              {(mappingsQuery.data?.mappings ?? []).map((mapping) => (
                <div key={mapping.id} className="flex items-center gap-3 p-3">
                  <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                    <UserRound className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-700">
                      {mapping.aeName}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      Updated {formatDateTime(mapping.updatedAt)} by{" "}
                      {mapping.changedBy} · self-reported
                    </p>
                  </div>
                  <Badge variant="info">{mapping.segment}</Badge>
                </div>
              ))}
              {!mappingsQuery.error &&
                !mappingsQuery.isLoading &&
                !mappingsQuery.data?.mappings.length && (
                  <p className="p-6 text-center text-xs text-slate-500">
                    No shared mappings yet. Unresolved records remain in
                    Unmapped.
                  </p>
                )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Category override audit</CardTitle>
                <CardDescription>
                  Immutable from → to history; raw Salesforce values are never
                  changed
                </CardDescription>
              </div>
              <History className="size-5 text-slate-300" />
            </div>
          </CardHeader>
          <CardContent>
            {overridesQuery.error && (
              <DatabaseNotice error={overridesQuery.error} />
            )}
            <div className="max-h-[430px] space-y-3 overflow-y-auto pr-1">
              {(overridesQuery.data?.history ?? []).map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-slate-100 p-3"
                >
                  <p className="truncate text-xs font-semibold text-slate-700">
                    {entry.opportunityName}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge variant="default">{entry.fromCategory}</Badge>
                    <span className="text-slate-300">→</span>
                    <Badge variant="info">{entry.toCategory}</Badge>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {entry.reason}
                  </p>
                  <p className="mt-2 text-[10px] text-slate-400">
                    {formatDateTime(entry.createdAt)} · {entry.changedBy}{" "}
                    (self-reported)
                  </p>
                </div>
              ))}
              {!overridesQuery.error &&
                !overridesQuery.isLoading &&
                !overridesQuery.data?.history.length && (
                  <p className="py-10 text-center text-xs text-slate-500">
                    No audited overrides yet.
                  </p>
                )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DimensionOptions({
  title,
  options,
}: {
  title: string;
  options: readonly { value: string; available: boolean }[];
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-slate-600">{title}</p>
      <div className="space-y-2">
        {options.map((option) => (
          <div
            key={option.value}
            aria-disabled={!option.available}
            className={
              option.available
                ? "flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/50 p-3"
                : "flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 opacity-65"
            }
          >
            <span className="text-xs font-medium text-slate-700">
              {option.value}
            </span>
            {option.available ? (
              <Badge variant="success">
                <Check className="size-3" /> Available
              </Badge>
            ) : (
              <Badge variant="default">Disabled · later phase</Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DatabaseNotice({ error }: { error: unknown }) {
  return (
    <div className="mb-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span>
        {sharedDataErrorMessage(error)}{" "}
        {isDatabaseNotConfigured(error) &&
          "Add DATABASE_URL and run the Prisma migration; no browser fallback is used for live shared state."}
      </span>
    </div>
  );
}
