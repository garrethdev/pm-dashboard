import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Smartphone, SmartphoneOff, Users } from "@/components/ui/icons";
import { StatusPill } from "@/components/ui/pill";
import { cn } from "@/lib/utils";

export interface PhoneOption {
  id: number;
  name: string;
  model: string | null;
  isActive: boolean;
  /** How many accounts it holds right now. Only the Add account form reads it,
   *  to leave out a phone with no room (PF-21); the groups below count their
   *  own rows, so it is optional and the invented phones go without. */
  held?: number;
}

/**
 * One phone's block in the Accounts page's by-phone view — design ticket P4
 * (Garreth, 2026-09-22).
 *
 * This is the SHELL only: the phone's line, its count and its warmup switch.
 * What goes inside is the ordinary accounts table, cut to that phone's rows,
 * so grouping costs none of the detail — every column that is in the flat list
 * is in each group (Garreth, 2026-09-22). A grouped view that dropped half the
 * columns would only send you back to the other view to read them.
 *
 * WHY A SECOND VIEW at all: the day the warmup script is switched on, it is
 * switched on for a PHONE, not an account at a time. That day you want the
 * phone's accounts together and one press that sets them all. Every other day
 * the flat list is the right shape, which is why it stays the default.
 *
 * A PHONE WITH NO ACCOUNTS is still listed — a registered phone carrying
 * nothing is a fact worth seeing, not an absence to hide.
 */
export function PhoneGroupCard({
  name,
  model,
  isActive,
  href,
  count,
  warmup,
  notAPhone = false,
  children,
}: {
  name: string;
  model: string | null;
  isActive: boolean;
  href?: string;
  count: number;
  /** The phone-wide Manual / Automated switch, or null where there is no phone. */
  warmup: React.ReactNode;
  /** The last group — accounts on no phone at all — which is not one. */
  notAPhone?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full bg-pill-bg",
            isActive ? "text-text-muted" : "text-text-muted/60",
          )}
        >
          {/* A plain phone icon over the last group would say the opposite of
              what that group is. */}
          {notAPhone ? <SmartphoneOff className="size-4" /> : <Smartphone className="size-4" />}
        </span>
        <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
          {href ? (
            <Link href={href as never} className="truncate text-sm font-medium hover:text-accent">
              {name}
            </Link>
          ) : (
            <span className="truncate text-sm font-medium">{name}</span>
          )}
          {model && <span className="truncate text-xs text-text-muted">{model}</span>}
        </span>
        {!isActive && <StatusPill tone="warn">Off</StatusPill>}
        <span className="tnum shrink-0 text-xs text-text-muted">
          {count} {count === 1 ? "account" : "accounts"}
        </span>
        {warmup}
      </div>
      {children}
    </Card>
  );
}

/** Nothing to group: no phone registered and no account waiting for one. */
export function NoAccountsByPhone({ empty }: { empty: boolean }) {
  return (
    <Card className="flex flex-col">
      <EmptyState icon={empty ? Users : Smartphone}>
        {empty ? "No accounts yet" : "No phones yet"}
      </EmptyState>
    </Card>
  );
}
