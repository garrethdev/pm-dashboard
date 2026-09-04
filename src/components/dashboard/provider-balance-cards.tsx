import { ExternalLink, Globe, Smartphone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getProxyCheapBalance } from "@/lib/data/proxycheap";
import { getTextVerifiedBalance } from "@/lib/data/textverified";

/**
 * Balance cards for the two paid providers behind the Proxies & Phones page,
 * mirroring the GeeLark wallet card. Read-only: each links out to the
 * provider's own billing page. This dashboard never moves funds.
 */

/** Below this (USD) the balance turns red — same convention as the GeeLark card. */
const LOW = 20;

const TOPUP = {
  proxycheap: "https://app.proxy-cheap.com/billing",
  textverified: "https://www.textverified.com/app/billing",
} as const;

function BalanceCard({
  title,
  balance,
  detail,
  href,
  icon,
  className,
}: {
  title: string;
  balance: number | null;
  detail: string;
  href: string;
  icon: React.ReactNode;
  className?: string;
}) {
  const low = balance !== null && balance < LOW;
  const failed = balance === null;

  return (
    <Card className={className}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-nested bg-accent-soft text-accent">
            {icon}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">{title}</h2>
            <p
              className={`font-display text-2xl font-semibold tnum ${
                low ? "text-danger" : "text-accent"
              }`}
            >
              {failed ? "—" : `$${balance.toFixed(2)}`}
            </p>
            {/* Only surfaced on failure: a healthy balance speaks for itself. */}
            {failed && <p className="truncate text-xs text-text-muted">{detail}</p>}
          </div>
        </div>

        <a
          href={href}
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

export async function ProviderBalanceCards({ className }: { className?: string }) {
  // Independent: a TextVerified timeout must not blank the proxy-cheap balance.
  const [pc, tv] = await Promise.all([
    getProxyCheapBalance().catch(() => ({
      data: { balance: null, detail: "proxy-cheap unreachable" },
    })),
    getTextVerifiedBalance().catch(() => ({
      data: { balance: null, detail: "TextVerified unreachable" },
    })),
  ]);

  return (
    <div className={className}>
      <div className="grid gap-3 sm:grid-cols-2">
        <BalanceCard
          title="Proxy-Cheap"
          balance={pc.data.balance}
          detail={pc.data.detail}
          href={TOPUP.proxycheap}
          icon={<Globe className="size-4" />}
        />
        <BalanceCard
          title="TextVerified"
          balance={tv.data.balance}
          detail={tv.data.detail}
          href={TOPUP.textverified}
          icon={<Smartphone className="size-4" />}
        />
      </div>
    </div>
  );
}
