"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { DashCard } from "@/components/ui/card";
import { Dropdown } from "@/components/ui/dropdown";
import { FilterChips } from "@/components/ui/filter-chips";
import { FilterPills } from "@/components/ui/filter-pills";
import { StatusPill } from "@/components/ui/pill";
import { SearchInput } from "@/components/ui/search-input";
import type { AccountConfigRow, SchedulerConfigData } from "@/lib/data/scheduler-config";
import { minutesToEt } from "@/lib/data/scheduler-config";
import { healthTone } from "@/lib/health";
import { cn } from "@/lib/utils";

/**
 * Per-account posting limits — what the scheduler will actually enforce for
 * each account, after the fleet defaults, the age ramp, the health throttle
 * and any per-account override have all been resolved.
 *
 * It sits under the calendar because the calendar shows what came out and this
 * shows why that much came out. Filtering is client-side: ~30 rows, all already
 * on the page, so a round trip per keystroke would buy nothing.
 */

type StatusFilter = "all" | "blocked" | "throttled" | "full";
type PlatformFilter = "all" | "tiktok" | "instagram";
type CharFilter = "all" | "Character 2" | "Character 3" | "Character 4";

export function AccountLimitsTable({ data }: { data: SchedulerConfigData }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [platform, setPlatform] = useState<PlatformFilter>("all");
  const [character, setCharacter] = useState<CharFilter>("all");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.rows.filter((r) => {
      if (status === "blocked" && r.canDeliver) return false;
      if (status === "throttled" && !(r.canDeliver && r.throttleReason)) return false;
      if (status === "full" && (!r.canDeliver || r.throttleReason)) return false;
      if (platform !== "all" && r.platform !== platform) return false;
      if (character !== "all" && r.character !== character) return false;
      if (!q) return true;
      // Health and throttle reason are searchable too: "ramp" and "shadowbanned"
      // are the words someone actually arrives with.
      return [r.geelarkProfile, r.character, r.health, r.throttleReason, r.platform]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [data.rows, query, status, platform, character]);

  const extraFilters = (platform !== "all" ? 1 : 0) + (character !== "all" ? 1 : 0);

  const chips = [
    ...(platform !== "all"
      ? [
          {
            key: "platform",
            label: platform === "tiktok" ? "TikTok" : "Instagram",
            onClear: () => setPlatform("all" as PlatformFilter),
          },
        ]
      : []),
    ...(character !== "all"
      ? [
          {
            key: "character",
            label: character.replace("Character ", "Char "),
            onClear: () => setCharacter("all" as CharFilter),
          },
        ]
      : []),
  ];

  return (
    <DashCard
      title="Per-account posting limits"
      toolbar={
        <div className="flex flex-wrap items-center gap-2">
          <FilterPills
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: `All ${data.rows.length}` },
              { value: "blocked", label: `Blocked ${data.blocked}` },
              { value: "throttled", label: `Throttled ${data.throttled}` },
              { value: "full", label: "Full cadence" },
            ]}
          />
          <Dropdown
            label="Filters"
            icon={<SlidersHorizontal className="size-3.5" />}
            badge={extraFilters}
          >
            {() => (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium tracking-wider text-text-muted uppercase">
                    Platform
                  </span>
                  <FilterPills
                    value={platform}
                    onChange={setPlatform}
                    options={[
                      { value: "all", label: "All" },
                      { value: "tiktok", label: "TT" },
                      { value: "instagram", label: "IG" },
                    ]}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium tracking-wider text-text-muted uppercase">
                    Character
                  </span>
                  <FilterPills
                    value={character}
                    onChange={setCharacter}
                    options={[
                      { value: "all", label: "All" },
                      { value: "Character 2", label: "Char 2" },
                      { value: "Character 3", label: "Char 3" },
                      { value: "Character 4", label: "Char 4" },
                    ]}
                  />
                </div>
              </div>
            )}
          </Dropdown>
          <FilterChips
            chips={chips}
            onClearAll={() => {
              setPlatform("all");
              setCharacter("all");
            }}
          />
        </div>
      }
      actions={
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search profile, character, health…"
          className="w-full max-w-xs"
        />
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-muted">
              <th className="pb-2 font-medium">Profile</th>
              <th className="pb-2 font-medium">Character</th>
              <th className="pb-2 font-medium">Health</th>
              <th className="pb-2 text-right font-medium">Posts/day</th>
              <th className="pb-2 text-right font-medium">GLP/day</th>
              <th className="pb-2 text-right font-medium">Filler/day</th>
              <th className="pb-2 text-right font-medium">Min gap</th>
              <th className="pb-2 pl-6 font-medium">Window (ET)</th>
              <th className="pb-2 text-right font-medium">Fail rate 7 d</th>
              <th className="pb-2 pl-6 font-medium">Delivery</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <LimitRow key={r.geelarkProfile} row={r} />
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="py-6 text-center text-sm text-text-muted">
            No accounts match those filters.
          </p>
        )}
      </div>

      {rows.length > 0 && rows.length !== data.rows.length && (
        <p className="mt-3 text-xs text-text-muted">
          Showing {rows.length} of {data.rows.length} accounts.
        </p>
      )}
    </DashCard>
  );
}

function LimitRow({ row: r }: { row: AccountConfigRow }) {
  return (
    <tr className="border-t border-border">
      <td className="py-2.5 font-medium whitespace-nowrap">
        <Link
          href={`/accounts/${r.geelarkProfile.replace(/\D/g, "")}` as never}
          className="hover:text-accent"
        >
          {r.geelarkProfile}
        </Link>
      </td>
      <td className="py-2.5 whitespace-nowrap text-text-muted">
        {r.character?.replace("Character ", "Char ") ?? "—"}
      </td>
      <td className="py-2.5">
        {r.health ? (
          <StatusPill tone={healthTone(r.health)} dot={false}>
            {r.health}
          </StatusPill>
        ) : (
          <span className="text-xs text-text-muted">—</span>
        )}
      </td>
      <td className="py-2.5 text-right tnum">{r.maxPostsPerDay ?? "—"}</td>
      <td className={cn("py-2.5 text-right tnum", r.maxGlpPerDay === 0 && "text-danger")}>
        {r.maxGlpPerDay ?? "—"}
      </td>
      <td className="py-2.5 text-right tnum">{r.maxFillerPerDay ?? "—"}</td>
      <td className="py-2.5 text-right text-text-muted tnum">
        {r.minGapMinutes === null ? "—" : `${r.minGapMinutes}m`}
      </td>
      <td className="py-2.5 pl-6 whitespace-nowrap text-text-muted tnum">
        {minutesToEt(r.windowStartMin)}–{minutesToEt(r.windowEndMin)}
      </td>
      <td
        className={cn(
          "py-2.5 text-right tnum",
          r.failRate7d !== null && r.failRate7d >= 0.3 && "text-danger",
        )}
      >
        {r.failRate7d === null
          ? "—"
          : `${Math.round(r.failRate7d * 100)}% (${r.fails7d}/${r.attempts7d})`}
      </td>
      <td className="py-2.5 pl-6 whitespace-nowrap">
        {!r.canDeliver ? (
          <StatusPill tone="danger" dot={false}>
            blocked
          </StatusPill>
        ) : r.throttleReason ? (
          <StatusPill tone="warn" dot={false}>
            {r.throttleReason}
          </StatusPill>
        ) : (
          <span className="text-xs text-text-muted">full cadence</span>
        )}
      </td>
    </tr>
  );
}
