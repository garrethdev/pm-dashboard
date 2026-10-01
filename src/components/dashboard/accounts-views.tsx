"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CtaButton } from "@/components/ui/cta-button";
import { FilterPills } from "@/components/ui/filter-pills";
import { Rows, Smartphone, UserPlus, Users } from "@/components/ui/icons";
import type { PhoneOption } from "@/components/dashboard/accounts-by-phone";
import { AccountsTable } from "@/components/dashboard/accounts-table";
import { AddAccountModal, type MirrorOption } from "@/components/dashboard/add-account-modal";
import { CharactersModal } from "@/components/dashboard/characters-modal";
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
 * **Add account** (PF-21) sits beside the switcher, and is Physical-only for
 * the same reason: accounts on the Cloud fleet are made by the n8n
 * provisioning workflow, and accounts on real iPhones are made by nothing, so
 * this form is the only way they come into being. The form can still put the
 * new account on either fleet — it just is not offered from a Cloud screen.
 * It is the page's one accent button.
 *
 * **Characters** sits to its left (Garreth, 2026-10-01), as a plain button so
 * Add account stays the one accent. It opens every character, to edit one or
 * set up the next "Character N" that Add account and Edit account can then
 * choose.
 *
 * This component owns only which view is on and whether the form is open;
 * everything else belongs to the table, so the two views cannot drift apart.
 */
export function AccountsViews({
  rows,
  contentTypeOptions,
  fleet,
  phones,
  characters,
  suggestedProfile,
  demo = false,
}: {
  rows: AccountRow[];
  contentTypeOptions: Record<string, ContentTypeOption[]>;
  fleet: Fleet;
  /** Registered phones, in Physical only. */
  phones: PhoneOption[];
  /** The characters a new account may be given. */
  characters: string[];
  /** The lowest free Profile number, for the form's placeholder. */
  suggestedProfile: string;
  /** True on `?demo=1`: the rows are invented, so nothing may be saved. */
  demo?: boolean;
}) {
  const router = useRouter();
  const [view, setView] = useState<AccountsView>("account");
  const [adding, setAdding] = useState(false);
  const [charactersOpen, setCharactersOpen] = useState(false);
  // Said once above the table after a save, because the new row is somewhere
  // down a list of sixty and a silent close reads as nothing having happened.
  const [added, setAdded] = useState<string | null>(null);

  // What a Facebook account may follow: the Instagram accounts that are
  // posted by hand (Garreth, 2026-10-01).
  const instagramAccounts: MirrorOption[] = rows
    .filter((r) => r.isActive && r.platform === "instagram" && r.deliveryMode === "manual")
    .map((r) => ({
      profile: r.profile,
      username: r.username,
      deviceId: r.deviceId,
    }));

  if (fleet !== "physical") {
    return <AccountsTable rows={rows} contentTypeOptions={contentTypeOptions} fleet={fleet} />;
  }

  return (
    <>
      <AccountsTable
        rows={rows}
        contentTypeOptions={contentTypeOptions}
        fleet={fleet}
        groupByPhone={view === "phone"}
        phones={phones}
        characters={characters}
        demo={demo}
        notice={added}
        viewSwitch={
          <FilterPills
            // The height of Add account, so the title row's three controls
            // line up (Garreth, 2026-10-01).
            className="h-[34px]"
            pillClassName="self-stretch"
            value={view}
            onChange={setView}
            options={[
              {
                value: "account",
                label: "By account",
                icon: <Rows className="size-3.5" />,
              },
              {
                value: "phone",
                label: "By phone",
                icon: <Smartphone className="size-3.5" />,
              },
            ]}
          />
        }
        headerAction={
          // The invented farm reuses real Profile names, so its screen offers
          // no way to write one.
          demo ? null : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setAdded(null);
                  setCharactersOpen(true);
                }}
                className="inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-full border border-border bg-card-raised px-3.5 text-xs font-medium text-text-muted transition-colors hover:border-accent/50 hover:text-text-primary"
              >
                <Users className="size-3.5" />
                <span className="sr-only sm:not-sr-only">Characters</span>
              </button>
              <CtaButton
                // The same text, padding and height as Characters and the
                // view switch beside it, so the row reads as one set of
                // controls; it keeps its fill as the page's one accent
                // (Garreth, 2026-10-01).
                className="h-[34px] px-3.5! py-0! text-xs!"
                onClick={() => {
                  // The last account's line goes when the next one is started,
                  // so two saves cannot leave one stale sentence on screen.
                  setAdded(null);
                  setAdding(true);
                }}
              >
                <UserPlus className="size-3.5" />
                {/* The icon alone on a phone, the way the search row's own
                  buttons shed their labels there. `sr-only` rather than
                  `hidden`, so the button still has a name to read out at the
                  width where its label is not drawn. */}
                <span className="sr-only sm:not-sr-only">Add account</span>
              </CtaButton>
            </div>
          )
        }
      />

      {adding && (
        <AddAccountModal
          characters={characters}
          phones={phones}
          fleet={fleet}
          suggestedProfile={suggestedProfile}
          instagramAccounts={instagramAccounts}
          onClose={() => setAdding(false)}
          onCreated={(profile, deviceError) => {
            setAdding(false);
            setAdded(deviceError ? `${profile} added. ${deviceError}` : `${profile} added.`);
            router.refresh();
          }}
        />
      )}

      {charactersOpen && (
        <CharactersModal
          onClose={() => setCharactersOpen(false)}
          // The sheet stays open on its list; the page re-reads so Add account
          // and Edit account offer the new character straight away.
          onChanged={() => router.refresh()}
        />
      )}
    </>
  );
}
