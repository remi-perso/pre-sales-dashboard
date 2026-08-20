"use client";

import dynamic from "next/dynamic";

import { AppProviders } from "@/components/app-providers";
import { LoadingState } from "@/components/data-states";

const InsightsApp = dynamic(
  () => import("@/views/insights-app").then((module) => module.InsightsApp),
  {
    ssr: false,
    loading: () => <LoadingState label="Starting the insights workspace…" />,
  },
);

/**
 * The dashboard is intentionally client-only: Salesforce credentials and live
 * requests must never cross a server-rendering boundary.
 */
export function ClientDashboard() {
  return (
    <AppProviders>
      <InsightsApp />
    </AppProviders>
  );
}
