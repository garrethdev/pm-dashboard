"use client";

/**
 * The Connected services card on Settings (DEV-30, step one): whether the
 * dashboard is signed in to Higgsfield, as which account, on what plan and
 * with how many credits, and the buttons to connect, reconnect or drop it.
 * Connect is an ordinary link to the connect route, a full page change: that
 * route sends the browser on to Higgsfield's sign-in and back here.
 */
import { useState } from "react";
import { shortDate, useJson } from "@/components/carousel/kit";
import { DashCard } from "@/components/ui/card";
import { HoldButton } from "@/components/ui/hold-button";
import { Loader2 } from "@/components/ui/icons";
import { displayNameOf } from "@/lib/people";
import { cn } from "@/lib/utils";
import type { ConnectionStatus } from "@/server/carousel/services/higgsfield-mcp";

const STATUS = "/api/carousel-generator/higgsfield";
const CONNECT = "/api/carousel-generator/higgsfield/connect";

/** The kit's quiet outline button, as a real link (a route handler is not a page, so not `Link`). */
const QUIET = "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-border bg-card-raised px-3.5 py-1.5 text-xs font-medium whitespace-nowrap text-text-muted transition-colors hover:text-text-primary";
const ACCENT = "inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-transparent bg-accent px-3.5 py-1.5 text-xs font-medium whitespace-nowrap text-bg shadow-[inset_0_0_0_1px_var(--accent-deep)] transition-[transform,opacity] active:scale-[0.97]";

export function HiggsfieldConnection({ note, reason }: { note?: string; reason?: string }) {
  const { data: status, error, loading, reload, setData } = useJson<ConnectionStatus>(STATUS);
  const [busy, setBusy] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);

  const drop = async () => {
    setBusy(true);
    setDropError(null);
    const res = await fetch(STATUS, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setDropError(json.error ?? "Higgsfield could not be disconnected");
      return;
    }
    setData(null);
    reload();
  };

  let line: React.ReactNode;
  if (error) line = <span className="text-danger">{error}</span>;
  else if (loading || !status) line = <span className="inline-flex items-center gap-1.5"><Loader2 className="size-3 animate-spin" />Checking…</span>;
  else if (!status.connected) line = status.problem ? `Not connected. ${status.problem}` : "Not connected.";
  else if (status.reachable) line = `Connected as ${status.email ?? "an unnamed account"}${status.plan ? ` · ${status.plan} plan` : ""}${status.credits !== null ? ` · ${Math.round(status.credits).toLocaleString()} credits` : ""}`;
  else line = <span className="text-warn">Connected as {status.email ?? "an unnamed account"}, but Higgsfield could not be reached just now{status.problem ? `: ${status.problem}` : ""}.</span>;

  const since = status?.connected && status.connectedAt ? `Connected ${shortDate(status.connectedAt)}${status.connectedBy ? ` by ${displayNameOf(status.connectedBy) ?? status.connectedBy}` : ""}${status.lastUsedAt ? ` · last used ${shortDate(status.lastUsedAt)}` : ""}` : null;

  return (
    <DashCard title="Connected services">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium">Higgsfield</p>
            <p className="text-xs text-text-muted">{line}</p>
            {since && <p className="text-xs text-text-muted">{since}</p>}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {status?.connected ? (
              <>
                <a href={CONNECT} className={cn(QUIET, busy && "pointer-events-none opacity-40")}>Reconnect</a>
                <HoldButton onConfirm={() => void drop()} disabled={busy} className="bg-transparent border border-border text-text-muted">Hold to disconnect</HoldButton>
              </>
            ) : (
              <a href={CONNECT} className={cn(ACCENT, (busy || loading) && "pointer-events-none opacity-40")}>Connect Higgsfield</a>
            )}
          </div>
        </div>
        {dropError && <p role="alert" className="text-xs text-danger">{dropError}</p>}
        {note === "connected" && <p role="status" className="text-xs text-ok">Higgsfield is connected.</p>}
        {note === "error" && <p role="alert" className="text-xs text-danger">{reason || "The sign-in did not finish."}</p>}
        <p className="text-xs text-text-muted">
          The dashboard signs in to Higgsfield once, through the same connection Claude uses, and keeps that sign-in. Whatever it generates spends that account&apos;s credits and lands in its Assets. Sign in with the account you want the dashboard to use; Reconnect lets you pick a different one.
        </p>
      </div>
    </DashCard>
  );
}
