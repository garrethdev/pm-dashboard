import { ExternalLink, Wallet } from "@/components/ui/icons";
import { Card } from "@/components/ui/card";
import { getWallet } from "@/lib/data/wallet";

/** GeeLark's own billing page — top-ups happen there, not in this dashboard. */
const TOPUP_URL = "https://web-app.geelark.com/fee-manage";

/**
 * Compact wallet card: shows the GeeLark balance and a button that opens
 * GeeLark's top-up page in a new tab. Read-only — we never charge or transfer.
 */
export async function GeelarkWalletCard({ className }: { className?: string }) {
  const { data: wallet } = await getWallet();
  const low = wallet.status === "low";

  return (
    <Card className={className}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-nested bg-accent-soft text-accent">
            <Wallet className="size-4" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">GeeLark Wallet</h2>
            <p className="font-display text-2xl font-semibold tnum text-accent">
              {wallet.balance === null ? "—" : `$${wallet.balance.toFixed(2)}`}
            </p>
          </div>
        </div>

        <a
          href={TOPUP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-90 ${
            low ? "bg-danger text-white" : "bg-accent text-bg"
          }`}
        >
          Top up
          <ExternalLink className="size-3.5" />
        </a>
      </div>
    </Card>
  );
}
