"use client";

import {
  BarChart3,
  CircleGauge,
  DatabaseZap,
  ListChecks,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DashboardViewId =
  | "overview"
  | "opportunities"
  | "requalification"
  | "data-quality"
  | "settings";

const NAV_ITEMS: ReadonlyArray<{
  id: DashboardViewId;
  label: string;
  shortLabel: string;
  icon: typeof CircleGauge;
}> = [
  {
    id: "overview",
    label: "Executive overview",
    shortLabel: "Overview",
    icon: CircleGauge,
  },
  {
    id: "opportunities",
    label: "Opportunities",
    shortLabel: "Deals",
    icon: ListChecks,
  },
  {
    id: "requalification",
    label: "Needs re-qualification",
    shortLabel: "Re-qualify",
    icon: DatabaseZap,
  },
  {
    id: "data-quality",
    label: "Data quality",
    shortLabel: "Quality",
    icon: ShieldCheck,
  },
  {
    id: "settings",
    label: "Settings & mappings",
    shortLabel: "Settings",
    icon: Settings2,
  },
];

interface DashboardShellProps {
  activeView: DashboardViewId;
  onViewChange: (view: DashboardViewId) => void;
  connectionLabel: string;
  isLive: boolean;
  children: ReactNode;
}

export function DashboardShell({
  activeView,
  onViewChange,
  connectionLabel,
  isLive,
  children,
}: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[auto_1fr]">
      <aside
        data-print-hidden="true"
        className={cn(
          "sticky top-0 z-40 hidden h-screen shrink-0 flex-col border-r border-slate-200/80 bg-slate-950 text-slate-300 transition-[width] duration-200 lg:flex",
          collapsed ? "w-[84px]" : "w-[264px]",
        )}
      >
        <div className="flex h-20 items-center gap-3 border-b border-white/8 px-5">
          <div className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-400 to-violet-600 shadow-lg shadow-indigo-950/40">
            <BarChart3 className="size-5 text-white" />
            <span className="absolute -top-1 -right-1 size-2.5 rounded-full border-2 border-slate-950 bg-emerald-400" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-wide text-white">
                Northstar
              </p>
              <p className="truncate text-[11px] text-slate-500">
                SE Insights · UKI
              </p>
            </div>
          )}
        </div>

        <nav aria-label="Primary navigation" className="flex-1 space-y-1 p-3">
          {!collapsed && (
            <p className="px-3 pt-3 pb-2 text-[10px] font-semibold tracking-[0.18em] text-slate-600 uppercase">
              Workspace
            </p>
          )}
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const selected = item.id === activeView;
            return (
              <button
                key={item.id}
                type="button"
                title={collapsed ? item.label : undefined}
                onClick={() => onViewChange(item.id)}
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "group flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none",
                  selected
                    ? "bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
                  collapsed && "justify-center",
                )}
              >
                <Icon
                  className={cn(
                    "size-[18px] shrink-0",
                    selected && "text-indigo-300",
                  )}
                />
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && selected && (
                  <span className="ml-auto size-1.5 rounded-full bg-indigo-400" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/8 p-3">
          {!collapsed && (
            <div className="mb-3 rounded-xl border border-white/8 bg-white/[0.035] p-3">
              <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-white">
                <Sparkles className="size-3.5 text-indigo-300" /> Traceable by
                design
              </div>
              <p className="text-[11px] leading-4 text-slate-500">
                Scope, exclusions and data caveats stay visible beside every
                insight.
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-lg text-xs text-slate-500 hover:bg-white/5 hover:text-slate-300 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
            {!collapsed && "Collapse sidebar"}
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <header
          data-print-hidden="true"
          className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-slate-950 lg:hidden">
              <BarChart3 className="size-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">
                {NAV_ITEMS.find((item) => item.id === activeView)?.label}
              </p>
              <p className="hidden text-xs text-slate-500 sm:block">
                Okta · United Kingdom & Ireland
              </p>
            </div>
          </div>
          <Badge
            variant={isLive ? "success" : "info"}
            className="max-w-[14rem] truncate"
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                isLive ? "bg-emerald-500" : "bg-indigo-500",
              )}
            />
            {connectionLabel}
          </Badge>
        </header>

        <main className="mx-auto w-full max-w-[1560px] px-4 pt-5 pb-24 sm:px-6 lg:px-8 lg:pt-7 lg:pb-10">
          {children}
        </main>

        <nav
          data-print-hidden="true"
          aria-label="Mobile navigation"
          className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-5 rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-2xl shadow-slate-950/15 backdrop-blur-xl lg:hidden"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const selected = activeView === item.id;
            return (
              <Button
                key={item.id}
                variant="ghost"
                size="sm"
                onClick={() => onViewChange(item.id)}
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "h-12 flex-col gap-0.5 px-1 text-[10px]",
                  selected &&
                    "bg-indigo-50 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-700",
                )}
              >
                <Icon className="size-4" />
                <span className="max-w-full truncate">{item.shortLabel}</span>
              </Button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
