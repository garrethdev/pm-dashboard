import { ExternalLink, Wallet } from "@/components/ui/icons";
import { Card } from "@/components/ui/card";
import { CtaButton } from "@/components/ui/cta-button";
import { getWallet } from "@/lib/data/wallet";
import { cn } from "@/lib/utils";

/** GeeLark's own billing page — top-ups happen there, not in this dashboard. */
const TOPUP_URL = "https://web-app.geelark.com/fee-manage";

/**
 * Compact wallet card: shows the GeeLark balance and a button that opens
 * GeeLark's top-up page in a new tab. Read-only — we never charge or transfer.
 */
export async function GeelarkWalletCard({ className }: { className?: string }) {
  const { data: wallet } = await getWallet();
  const low = wallet.status === "low";

  // Label above value, the number carrying the weight — and the balance stays
  // plain text: it is a reading, not an action, so the accent belongs on the
  // one button instead. Red only when the wallet is actually low.
  return (
    <Card glass className={cn("dot-fade text-text-muted", className)}>
      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-nested bg-card-raised text-text-muted">
            <Wallet className="size-4" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-xs font-medium text-text-muted">GeeLark wallet</h2>
            <p
              className={cn(
                "font-display text-2xl font-semibold tracking-[-0.02em] tnum",
                low ? "text-danger" : "text-text-primary",
              )}
            >
              {wallet.balance === null ? "—" : `$${wallet.balance.toFixed(2)}`}
            </p>
          </div>
        </div>

        <CtaButton
          href={TOPUP_URL}
          target="_blank"
          rel="noopener noreferrer"
          tone={low ? "danger" : "accent"}
          className="shrink-0"
        >
          Top up
          <ExternalLink className="size-3.5" />
        </CtaButton>
      </div>
    </Card>
  );
}
