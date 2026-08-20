"use client";

import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency, formatNumber } from "@/lib/format";
import type { TrendPoint } from "@/types";

export function TrendChart({ points }: { points: readonly TrendPoint[] }) {
  return (
    <div
      role="img"
      aria-label="Fiscal quarter ARR and opportunity count trend"
      className="h-[280px] w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={points}
          margin={{ top: 12, right: 6, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="arrFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.22} />
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.015} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="#e2e8f0"
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            dy={10}
          />
          <YAxis
            yAxisId="amount"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#94a3b8", fontSize: 10 }}
            tickFormatter={(value: number) => formatCurrency(value)}
            width={58}
          />
          <YAxis yAxisId="count" orientation="right" hide />
          <Tooltip
            cursor={{ fill: "#f8fafc" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const amount = payload.find(
                (entry) => entry.dataKey === "amount",
              )?.value;
              const count = payload.find(
                (entry) => entry.dataKey === "count",
              )?.value;
              return (
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                  <p className="text-xs font-semibold text-slate-800">
                    {label}
                  </p>
                  <p className="mt-1 text-xs text-indigo-600">
                    ARR: {formatCurrency(Number(amount))}
                  </p>
                  <p className="text-xs text-slate-500">
                    Opportunities: {formatNumber(Number(count))}
                  </p>
                </div>
              );
            }}
          />
          <Area
            yAxisId="amount"
            type="monotone"
            dataKey="amount"
            stroke="#4f46e5"
            strokeWidth={2.5}
            fill="url(#arrFill)"
            activeDot={{
              r: 5,
              fill: "#4f46e5",
              stroke: "white",
              strokeWidth: 2,
            }}
            isAnimationActive={false}
          />
          <Bar
            yAxisId="count"
            dataKey="count"
            fill="#c7d2fe"
            radius={[5, 5, 0, 0]}
            barSize={13}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
