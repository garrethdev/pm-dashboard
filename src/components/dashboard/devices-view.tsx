"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Smartphone } from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { CtaButton } from "@/components/ui/cta-button";
import { StatusPill } from "@/components/ui/pill";
import { AddDeviceModal } from "@/components/dashboard/add-device-modal";
import { proxyForDisplay } from "@/lib/data/device-rules";
import type { Device } from "@/lib/data/devices";
import { cn } from "@/lib/utils";

function Fact({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col">
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className={cn("truncate text-sm", mono && "font-mono text-xs leading-5")}>
        {value ?? "—"}
      </dd>
    </div>
  );
}

/**
 * The Devices list: one tile per physical phone.
 *
 * Tiles rather than a table because this page is used from an iPhone as much
 * as from a desk, and eight columns do not fit 375px; a tile stacks cleanly at
 * one per row and tiles up to three across on a desktop.
 */
export function DevicesView({
  devices,
  proofUrls,
}: {
  devices: Device[];
  /** Short-lived signed links, keyed by the phone's proof path. */
  proofUrls: Record<string, string>;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Devices</h1>
        <CtaButton onClick={() => setAdding(true)}>
          <Plus className="size-3.5" />
          Add phone
        </CtaButton>
      </div>

      {devices.length === 0 ? (
        <Card className="flex flex-col">
          <EmptyState icon={Smartphone}>No phones yet</EmptyState>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {devices.map((d) => {
            const proofUrl = d.proofPath ? proofUrls[d.proofPath] : undefined;
            return (
              <li key={d.id}>
                <Link
                  href={`/devices/${d.id}` as never}
                  className={cn(
                    "flex h-full gap-4 rounded-card border border-border bg-card p-4 shadow-card transition-colors hover:border-text-muted/50",
                    !d.isActive && "opacity-60",
                  )}
                >
                  {/* Portrait, like the screenshot it holds. */}
                  <div className="flex h-28 w-16 shrink-0 items-center justify-center overflow-hidden rounded-nested border border-border bg-card-raised">
                    {proofUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- signed, short-lived storage link; not optimisable
                      <img
                        src={proofUrl}
                        alt={`${d.name} proof screenshot`}
                        loading="lazy"
                        className="size-full object-cover object-top"
                      />
                    ) : (
                      <span className="px-1 text-center text-[11px] leading-4 text-text-muted">
                        {d.proofPath ? "Proof on file" : "No proof yet"}
                      </span>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="min-w-0 truncate text-base font-semibold">{d.name}</h2>
                      <StatusPill tone={d.isActive ? "ok" : "neutral"}>
                        {d.isActive ? "Active" : "Off"}
                      </StatusPill>
                      {/* A count, not a fraction: a phone has no maximum
                          (Garreth, 2026-09-22), so "3/3" would go on claiming
                          one. Nothing is "full" any more, so no warn tone. */}
                      <StatusPill tone="gray" className="tnum">
                        {d.accounts.length} account{d.accounts.length === 1 ? "" : "s"}
                      </StatusPill>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <Fact label="Model" value={d.model} />
                      <Fact label="iOS" value={d.iosVersion} />
                      <Fact label="Proxy" value={proxyForDisplay(d.proxy)} mono />
                      <Fact label="Time zone" value={d.timezone} />
                    </dl>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {adding && (
        <AddDeviceModal
          onClose={() => setAdding(false)}
          onCreated={(id, proofError) => {
            // Straight to the new phone: that is where its accounts are added,
            // and where a screenshot that failed to upload can be tried again.
            router.push(
              (proofError ? `/devices/${id}?proof=failed` : `/devices/${id}`) as never,
            );
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
