"use client";

import { useState } from "react";
import { CheckCircle2, Globe, Smartphone } from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/empty-state";
import { DashCard } from "@/components/ui/card";
import { FilterPills } from "@/components/ui/filter-pills";
import { ExtendButton } from "@/components/ui/extend-button";
import { StatusPill, type PillTone } from "@/components/ui/pill";

export interface AttentionItem {
  key: string;
  profile: string;
  detail: string;
  tone: PillTone;
  label: string;
  /**
   * Provider panel to open for this row, or null when there is nothing to
   * extend. The dashboard hands the job over rather than doing it: extending
   * spends money on a card on file, and a mis-fired write here is unrecoverable.
   */
  extendHref: string | null;
}

export interface ProxiesCardProps {
  fetchedAt?: string;
  className?: string;
  proxies: { attention: AttentionItem[]; footer: string };
  phones: { attention: AttentionItem[]; footer: string };
}

type View = "proxies" | "phones";

function AttentionList({
  items,
  footer,
  view,
}: {
  items: AttentionItem[];
  footer: string;
  view: View;
}) {
  return (
    <>
      {items.length > 0 ? (
        <div className="flex flex-col divide-y divide-border">
          {items.map((row) => (
            <div key={row.key} className="flex items-center gap-3 py-2.5">
              <span className="w-24 shrink-0 truncate text-sm font-medium">{row.profile}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-text-muted">{row.detail}</span>
              <StatusPill tone={row.tone}>{row.label}</StatusPill>
              {row.extendHref && <ExtendButton href={row.extendHref} />}
            </div>
          ))}
        </div>
      ) : (
        // The shared empty state, centred in the space above the footer
        // (Garreth, 2026-09-23).
        <EmptyState icon={view === "proxies" ? Globe : Smartphone} compact className="flex-1">
          Nothing needs attention
        </EmptyState>
      )}
      <p className="mt-auto flex items-center gap-1.5 border-t border-border pt-3 text-xs text-text-muted">
        <CheckCircle2 className="size-3.5 text-ok" />
        {footer}
      </p>
    </>
  );
}

/** Homepage proxies/phones card — presentational; data comes from the server wrapper. */
export function ProxiesCard({
  fetchedAt,
  className,
  proxies,
  phones,
}: ProxiesCardProps) {
  const [view, setView] = useState<View>("proxies");
  const active = view === "proxies" ? proxies : phones;

  return (
    <DashCard
      title="Proxies & numbers"
      fetchedAt={fetchedAt}
      viewAllHref="/proxies"
      className={className}
      toolbar={
        <FilterPills
          value={view}
          onChange={setView}
          options={[
            { value: "proxies", label: "Proxies" },
            { value: "phones", label: "Phone numbers" },
          ]}
        />
      }
    >
      <div className="flex h-full min-h-0 flex-col gap-3">
        <AttentionList items={active.attention} footer={active.footer} view={view} />
      </div>
    </DashCard>
  );
}
