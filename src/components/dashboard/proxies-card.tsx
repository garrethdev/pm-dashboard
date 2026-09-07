"use client";

import { useState } from "react";
import { CheckCircle2 } from "@/components/ui/icons";
import { DashCard } from "@/components/ui/card";
import { FilterPills } from "@/components/ui/filter-pills";
import { StatusPill, type PillTone } from "@/components/ui/pill";

export interface AttentionItem {
  key: string;
  profile: string;
  detail: string;
  tone: PillTone;
  label: string;
  /** Extend/renew is a Phase 2 write — button renders disabled until then. */
  extendable: boolean;
}

export interface ProxiesCardProps {
  fetchedAt?: string;
  className?: string;
  proxies: { attention: AttentionItem[]; footer: string };
  phones: { attention: AttentionItem[]; footer: string };
}

type View = "proxies" | "phones";

function AttentionList({ items, footer }: { items: AttentionItem[]; footer: string }) {
  return (
    <>
      {items.length > 0 ? (
        <div className="flex flex-col divide-y divide-border">
          {items.map((row) => (
            <div key={row.key} className="flex items-center gap-3 py-2.5">
              <span className="w-24 shrink-0 truncate text-sm font-medium">{row.profile}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-text-muted">{row.detail}</span>
              <StatusPill tone={row.tone}>{row.label}</StatusPill>
              {row.extendable && (
                <button
                  disabled
                  title="Write actions arrive in Phase 2"
                  className="cursor-not-allowed rounded-full border border-border bg-card-raised px-3 py-1 text-xs font-medium opacity-50"
                >
                  Extend
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="py-2 text-sm text-text-muted">Nothing needs attention.</p>
      )}
      <p className="mt-auto flex items-center gap-1.5 border-t border-border pt-3 text-xs text-text-muted">
        <CheckCircle2 className="size-3.5 text-ok" />
        {footer}
      </p>
    </>
  );
}

/** Homepage proxies/phones card — presentational; data comes from the server wrapper. */
export function ProxiesCard({ fetchedAt, className, proxies, phones }: ProxiesCardProps) {
  const [view, setView] = useState<View>("proxies");
  const active = view === "proxies" ? proxies : phones;

  return (
    <DashCard
      title="Proxies & phones"
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
        <AttentionList items={active.attention} footer={active.footer} />
      </div>
    </DashCard>
  );
}
