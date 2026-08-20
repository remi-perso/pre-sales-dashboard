import { AlertTriangle, LoaderCircle, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function LoadingState({
  label = "Preparing your insights…",
}: {
  label?: string;
}) {
  return (
    <div className="grid min-h-[55vh] place-items-center">
      <div className="text-center">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
          <LoaderCircle className="size-5 animate-spin" />
        </div>
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="mt-1 text-xs text-slate-500">
          Scope and trust signals are calculated together.
        </p>
      </div>
    </div>
  );
}

export function ErrorState({
  title = "We couldn’t load this view",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="mx-auto mt-16 max-w-xl p-7 text-center">
      <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-rose-50 text-rose-600">
        <AlertTriangle className="size-5" />
      </div>
      <h2 className="font-semibold text-slate-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {message}
      </p>
      {onRetry && (
        <Button className="mt-5" onClick={onRetry}>
          <RefreshCcw className="size-4" /> Try again
        </Button>
      )}
    </Card>
  );
}
