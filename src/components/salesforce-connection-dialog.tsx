"use client";

import {
  CheckCircle2,
  Copy,
  KeyRound,
  PanelTop,
  ShieldCheck,
} from "lucide-react";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getDisplayName,
  saveDisplayName,
  saveSalesforceCredentials,
} from "@/state/salesforce-session";

interface SalesforceConnectionDialogProps {
  open: boolean;
  expired?: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: () => void;
}

const DEFAULT_INSTANCE_URL =
  process.env.NEXT_PUBLIC_SALESFORCE_INSTANCE_URL ??
  "https://your-domain.my.salesforce.com";

export function SalesforceConnectionDialog({
  open,
  expired = false,
  onOpenChange,
  onConnected,
}: SalesforceConnectionDialogProps) {
  const [displayName, setDisplayName] = useState(() => getDisplayName() ?? "");
  const [instanceUrl, setInstanceUrl] = useState(DEFAULT_INSTANCE_URL);
  const [sessionId, setSessionId] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!displayName.trim()) {
      setError("Enter the display name that should appear on shared changes.");
      return;
    }

    try {
      saveDisplayName(displayName);
      saveSalesforceCredentials({ instanceUrl, sessionId });
      setSessionId("");
      onConnected();
      onOpenChange(false);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The connection details are invalid.",
      );
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setSessionId("");
          setError(null);
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        className="max-w-2xl p-0"
        onOpenAutoFocus={() => setDisplayName(getDisplayName() ?? "")}
      >
        <div className="border-b border-slate-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 px-6 py-6">
          <DialogHeader>
            <div className="mb-3 grid size-11 place-items-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
              <KeyRound className="size-5" />
            </div>
            <DialogTitle>
              {expired
                ? "Your Salesforce session has expired"
                : "Connect your Salesforce session"}
            </DialogTitle>
            <DialogDescription>
              {expired
                ? "Salesforce rejected the previous session. Live results were cleared; paste a fresh session ID to continue."
                : "Your browser connects directly to Salesforce. The session ID stays in this tab and is never sent to this app’s server."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="grid gap-6 px-6 pb-6 md:grid-cols-[0.92fr_1.08fr]">
          <div>
            <p className="mb-3 text-xs font-semibold tracking-[0.14em] text-slate-400 uppercase">
              Get a session ID
            </p>
            <ol className="space-y-3">
              {[
                {
                  icon: PanelTop,
                  text: "Sign in to Salesforce in Chrome, then open DevTools (F12).",
                },
                {
                  icon: Copy,
                  text: "Open Network, refresh the page, and select a Salesforce API request.",
                },
                {
                  icon: KeyRound,
                  text: "Under Request Headers, copy the value after “Bearer” in Authorization.",
                },
              ].map((step, index) => {
                const Icon = step.icon;
                return (
                  <li
                    key={step.text}
                    className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3"
                  >
                    <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-indigo-600 shadow-sm">
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                        Step {index + 1}
                      </p>
                      <p className="mt-0.5 text-xs leading-5 text-slate-600">
                        {step.text}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
            <div className="mt-3 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" />
              Your app origin must be listed under Salesforce Setup → CORS once
              by an admin.
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="connection-display-name">Display name</Label>
              <Input
                id="connection-display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="e.g. Remi P."
                autoComplete="off"
              />
              <p className="text-[11px] leading-4 text-slate-400">
                Self-reported, not verified. Saved in this tab only and attached
                to shared edits.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="salesforce-instance">
                Salesforce instance URL
              </Label>
              <Input
                id="salesforce-instance"
                type="url"
                value={instanceUrl}
                onChange={(event) => setInstanceUrl(event.target.value)}
                placeholder="https://company.my.salesforce.com"
                autoCapitalize="none"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="salesforce-session-id">Session ID</Label>
              <Input
                id="salesforce-session-id"
                type="password"
                value={sessionId}
                onChange={(event) => setSessionId(event.target.value)}
                placeholder="Paste the value after Bearer"
                autoCapitalize="none"
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-[11px] leading-4 text-slate-400">
                Stored in sessionStorage only; cleared on logout, expiry, or tab
                close.
              </p>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700"
              >
                {error}
              </p>
            )}

            <Button type="submit" variant="accent" className="w-full">
              <CheckCircle2 className="size-4" /> Connect and load live data
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
