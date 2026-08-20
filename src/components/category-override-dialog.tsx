"use client";

import { History, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CategoryResolution, Opportunity, WonCategory } from "@/types";
import { WON_CATEGORIES } from "@/types";
import { useSaveCategoryOverride } from "@/views/use-shared-data";

interface CategoryOverrideDialogProps {
  opportunity: Opportunity | null;
  resolution: CategoryResolution | null;
  changedBy: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNeedsIdentity: () => void;
}

export function CategoryOverrideDialog({
  opportunity,
  resolution,
  changedBy,
  open,
  onOpenChange,
  onNeedsIdentity,
}: CategoryOverrideDialogProps) {
  const mutation = useSaveCategoryOverride();
  const [category, setCategory] = useState<WonCategory>("Uncategorized");
  const [reason, setReason] = useState("");

  if (!opportunity || !resolution) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!changedBy) {
      onNeedsIdentity();
      return;
    }
    try {
      await mutation.mutateAsync({
        opportunityId: opportunity!.id,
        opportunityName: opportunity!.name,
        inferredCategory: resolution!.inferredCategory,
        toCategory: category,
        reason,
        changedBy,
      });
      onOpenChange(false);
    } catch {
      // TanStack Query retains the sanitized error rendered below.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={() => {
          setCategory(resolution.category);
          setReason("");
          mutation.reset();
        }}
      >
        <DialogHeader>
          <DialogTitle>Override inferred won category</DialogTitle>
          <DialogDescription>
            The Salesforce values stay untouched. This adds an audited shared
            override for {opportunity.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
          <Sparkles className="size-4 text-indigo-600" />
          <span className="text-xs font-medium text-indigo-950">Inference</span>
          <Badge variant="info">{resolution.inferredCategory}</Badge>
          {resolution.matchedKeyword && (
            <span className="text-[11px] text-indigo-600">
              matched “{resolution.matchedKeyword}”
            </span>
          )}
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="override-category">Effective category</Label>
            <Select
              value={category}
              onValueChange={(value) => setCategory(value as WonCategory)}
            >
              <SelectTrigger id="override-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WON_CATEGORIES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="override-reason">Reason for change</Label>
            <Textarea
              id="override-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="What did the account team confirm?"
              minLength={3}
              maxLength={1000}
              required
            />
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
            <div className="flex items-center gap-2 font-medium text-slate-700">
              <History className="size-3.5" /> Audit attribution
            </div>
            {changedBy ? (
              <p className="mt-1">
                Changed by “{changedBy}” (self-reported, not a verified
                identity).
              </p>
            ) : (
              <p className="mt-1 text-amber-700">
                Add a session display name in Settings before saving.
              </p>
            )}
          </div>

          {mutation.error && (
            <p
              role="alert"
              className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700"
            >
              {mutation.error.message}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="accent"
              disabled={mutation.isPending || category === resolution.category}
            >
              {mutation.isPending ? "Saving…" : "Save audited override"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
