"use client";

import { useState } from "react";
import { FilterPills } from "@/components/ui/filter-pills";
import { Rows, Smartphone } from "@/components/ui/icons";
import type { PhoneOption } from "@/components/dashboard/accounts-by-phone";
import { AccountsTable } from "@/components/dashboard/accounts-table";
import type { AccountRow } from "@/lib/data/accounts";
import type { ContentTypeOption } from "@/lib/data/scheduler-overrides";
import type { Fleet } from "@/lib/fleet";

type AccountsView = "account" | "phone";

/**
 * The Accounts page's two views — design ticket P4 (Garreth, 2026-09-22).
 *
 *  - **By account** is the table as it has always been, one row per account,
 *    the same as Cloud's. It stays the DEFAULT, so nothing changes for anyone
 *    who is not thinking about phones.
 *  - **By phone** is the same table, cut into one block per phone, with the
 *    phone-wide warmup switch on each block's line. Same columns, same
 *    filters, same sorting — only the grouping differs.
 *
 * PHYSICAL ONLY. Cloud has no phones, so it never sees the switcher and its
 * Accounts page keeps its single header row — the rule the rest of the
 * phone-farm work follows.
 *
 * This component owns only which view is on; everything else belongs to the
 * table, so the two views cannot drift apart.
 */
export function AccountsViews({
  rows,
  contentTypeOptions,
  fleet,
  phones,
  demo = false,
}: {
  rows: AccountRow[];
  contentTypeOptions: Record<string, ContentTypeOption[]>;
  fleet: Fleet;
  /** Registered phones, in Physical only. */
  phones: PhoneOption[];
  /** True on `?demo=1`: the rows are invented, so nothing may be saved. */
  demo?: boolean;
}) {
  const [view, setView] = useState<AccountsView>("account");

  if (fleet !== "physical") {
    return <AccountsTable rows={rows} contentTypeOptions={contentTypeOptions} fleet={fleet} />;
  }

  return (
    <AccountsTable
      rows={rows}
      contentTypeOptions={contentTypeOptions}
      fleet={fleet}
      groupByPhone={view === "phone"}
      phones={phones}
      demo={demo}
      viewSwitch={
        <FilterPills
          inline
          value={view}
          onChange={setView}
          options={[
            { value: "account", label: "By account", icon: <Rows className="size-3.5" /> },
            { value: "phone", label: "By phone", icon: <Smartphone className="size-3.5" /> },
          ]}
        />
      }
    />
  );
}
