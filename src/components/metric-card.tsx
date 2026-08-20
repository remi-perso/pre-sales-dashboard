import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string;
  secondaryValue?: string;
  caption: ReactNode;
  change?: number | null;
  changeLabel?: string;
  icon: ReactNode;
  accent?: "indigo" | "emerald" | "amber" | "rose";
}

const ACCENTS = {
  indigo:
    "bg-indigo-50 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300",
  emerald:
    "bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
  rose: "bg-rose-50 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300",
};

export function MetricCard({
  label,
  value,
  secondaryValue,
  caption,
  change,
  changeLabel,
  icon,
  accent = "indigo",
}: MetricCardProps) {
  const TrendIcon =
    change == null || change === 0
      ? Minus
      : change > 0
        ? ArrowUpRight
        : ArrowDownRight;
  return (
    <Card data-print-card="true" className="relative overflow-hidden p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div
          className={cn(
            "grid size-10 place-items-center rounded-xl",
            ACCENTS[accent],
          )}
        >
          {icon}
        </div>
        {change !== undefined && (
          <Badge
            variant={
              change == null ? "default" : change >= 0 ? "success" : "danger"
            }
          >
            <TrendIcon className="size-3" />
            {change == null
              ? "No prior baseline"
              : `${Math.abs(change).toFixed(1)}%`}
          </Badge>
        )}
      </div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="text-[2rem] leading-tight font-semibold tracking-[-0.04em] text-slate-950">
          {value}
        </p>
        {secondaryValue && (
          <p className="text-sm font-semibold text-slate-400">
            {secondaryValue}
          </p>
        )}
      </div>
      <div className="mt-4 border-t border-slate-100 pt-3 text-[11px] leading-4 text-slate-500">
        {caption}
        {changeLabel && (
          <span className="ml-1 text-slate-400">· {changeLabel}</span>
        )}
      </div>
    </Card>
  );
}
