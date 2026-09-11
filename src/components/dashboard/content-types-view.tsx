"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal } from "@/components/ui/icons";
import { DashCard } from "@/components/ui/card";
import { Dropdown } from "@/components/ui/dropdown";
import { FilterChips } from "@/components/ui/filter-chips";
import { FilterPills } from "@/components/ui/filter-pills";
import { StatusPill } from "@/components/ui/pill";
import { SearchInput } from "@/components/ui/search-input";
import { SortButton, cycleSort, type SortDir } from "@/components/ui/sort-button";
import {
  ContentTypeCards,
  LIFECYCLE_TONE,
} from "@/components/dashboard/content-type-cards";
import {
  ContentTypeLifecycleModal,
  type LifecycleAction,
} from "@/components/dashboard/content-type-lifecycle-modal";
import {
  CT_DEFAULT_RANGE,
  CT_RANGES,
  type ContentTypeRow,
  type ContentTypesData,
  type CtRangeKey,
} from "@/lib/data/content-types";
import { formatEtDate } from "@/lib/data/format";
import { useDataRefresh } from "@/lib/refresh-bus";
import { cn } from "@/lib/utils";

/**
 * Content Types — the catalogue, and what each lane is worth.
 *
 * Three character cards for browsing, one table for deciding. The table is the
 * only place a lane is switched off, and switching it off is a real change:
 * `content_type_registry.active` is what the Smart Scheduler, the poster, the
 * inventory monitor and the production order all gate on, so a paused lane
 * stops fleet-wide as soon as the dialog closes.
 */

const compact = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1000).toFixed(1)}k` : String(v);

/** Retired is not one of these: it is the Show-retired toggle's job, the same
 *  split the Accounts table uses for banned accounts. */
type StatusFilter = "all" | "live" | "paused";
/** Derived from the data — see the same note in accounts-table. */
type CharFilter = string;

type SortKey =
  | "displayName"
  | "cadencePerWeek"
  | "posts"
  | "medianViews"
  | "pctDead"
  | "engRate"
  | "momentumPct"
  | "score"
  | "lastPostedAt";

/**
 * A lane worth putting a red button next to: it is dying, not merely mediocre.
 * Thin data is excluded on purpose — under eight posts a median swings on one
 * viral hit and the "collapse" is noise.
 */
function isCollapsing(t: ContentTypeRow): boolean {
  if (t.lifecycle !== "live" || t.confidence === "low") return false;
  if (t.pctDead !== null && t.pctDead >= 50) return true;
  if (t.momentumPct !== null && t.momentumPct <= -40) return true;
  return t.tier === "D";
}

export function ContentTypesView({ initial }: { initial: ContentTypesData }) {
  const router = useRouter();
  const [range, setRange] = useState<CtRangeKey>(CT_DEFAULT_RANGE);
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [character, setCharacter] = useState<CharFilter>("all");
  const characterOptions = [
    { value: "all", label: "All" },
    ...data.characters.map((c) => ({ value: c.name, label: c.name.replace("Character ", "Char ") })),
  ];
  const [showRetired, setShowRetired] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir } | null>({
    key: "score",
    dir: "desc",
  });
  const [pending, setPending] = useState<{ action: LifecycleAction; target: ContentTypeRow } | null>(
    null,
  );

  const load = useCallback(async (r: CtRangeKey) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/content-types?range=${r}`, { cache: "no-store" });
      const body = (await res.json()) as { data?: ContentTypesData };
      if (body.data) setData(body.data);
    } finally {
      setLoading(false);
    }
  }, []);

  // The lifecycle modal already reloads this slice when it closes; the global
  // Refresh button did not, so it left the table showing whatever range had
  // been picked. Same loader, same range.
  useDataRefresh(useCallback(() => load(range), [load, range]));

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = data.all.filter((t) => {
      // Retired lanes are out of the table unless asked for; when they are
      // asked for, they are all that changes — the status filter still only
      // speaks about live vs paused.
      if (t.lifecycle === "retired" && !showRetired) return false;
      if (status !== "all" && t.lifecycle !== "retired" && t.lifecycle !== status) return false;
      if (character !== "all" && t.character !== character) return false;
      if (!q) return true;
      return [t.displayName, t.contentType, t.character].some((v) => v.toLowerCase().includes(q));
    });
    if (!sort) return filtered;
    const dir = sort.dir === "desc" ? -1 : 1;
    return [...filtered].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * dir;
      // A lane with no data sorts to the bottom whichever way the column runs,
      // rather than pretending to be a zero.
      const an = av === null ? Number.NEGATIVE_INFINITY : Number(av);
      const bn = bv === null ? Number.NEGATIVE_INFINITY : Number(bv);
      return (an - bn) * dir;
    });
  }, [data.all, query, status, character, showRetired, sort]);

  const counts = useMemo(() => {
    const c = { live: 0, paused: 0, retired: 0 };
    for (const t of data.all) c[t.lifecycle]++;
    return c;
  }, [data.all]);

  const extraFilters = (status !== "all" ? 1 : 0) + (character !== "all" ? 1 : 0);

  // What the dropdown is currently doing, said out loud beside it.
  const chips = [
    ...(status !== "all"
      ? [{ key: "status", label: status === "live" ? "Live" : "Paused", onClear: () => setStatus("all") }]
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
  const clearFilters = () => {
    setStatus("all");
    setCharacter("all");
  };

  const peersFor = (t: ContentTypeRow) =>
    data.all.filter(
      (p) =>
        p.character === t.character &&
        p.bucket === "glp" &&
        p.lifecycle === "live" &&
        p.contentType !== t.contentType,
    );

  const th = (key: SortKey, label: string) => (
    <SortButton
      label={label}
      active={sort?.key === key}
      dir={sort?.key === key ? sort.dir : "desc"}
      onClick={() => setSort((s) => cycleSort(s, key))}
    />
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Header laid out like Analytics: title left, freshness + range right. */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <h1 className="text-lg font-semibold">Content types</h1>
        <div className="flex flex-wrap items-center gap-3">
          {/* Not real-time: both performance tables are filled by scheduled
              ingests, so this is the honest "as of" for every number here. */}
          <span
            className={cn(
              "text-xs whitespace-nowrap text-text-muted",
              loading && "animate-pulse",
            )}
          >
            {loading ? "updating…" : `as of ${formatEtDate(data.lastIngest)}`}
          </span>
          <FilterPills
            value={range}
            // Fetched from the click, not from an effect on `range`: the server
            // already rendered the default range, so an effect would re-fetch it
            // on mount for nothing.
            onChange={(r) => {
              setRange(r);
              void load(r);
            }}
            options={CT_RANGES.map((r) => ({ value: r.key, label: r.label }))}
          />
        </div>
      </div>

      <ContentTypeCards characters={data.characters} />

      <DashCard
        title="Performance"
        toolbar={
          <div className="flex flex-wrap items-center gap-3">
            <Dropdown
              label="Filters"
              icon={<SlidersHorizontal className="size-3.5" />}
              badge={extraFilters}
            >
              {() => (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-medium tracking-wider text-text-muted uppercase">
                      Status
                    </span>
                    <FilterPills
                      value={status}
                      onChange={setStatus}
                      options={[
                        { value: "all", label: `All ${counts.live + counts.paused}` },
                        { value: "live", label: `Live ${counts.live}` },
                        { value: "paused", label: `Paused ${counts.paused}` },
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
                      options={characterOptions}
                    />
                  </div>
                </div>
              )}
            </Dropdown>
            <FilterChips chips={chips} onClearAll={clearFilters} />
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-text-muted">
              <input
                type="checkbox"
                checked={showRetired}
                onChange={(e) => setShowRetired(e.target.checked)}
                className="size-4 accent-accent"
              />
              Show retired ({counts.retired})
            </label>
          </div>
        }
        actions={
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search content type or character…"
            // An explicit 24rem, matching the accounts search. `w-full
            // max-w-sm` cannot work here: DashCard's actions slot is shrink-0
            // and sized by its content, so `w-full` resolves to the input's own
            // intrinsic width instead of stretching it. max-w-full keeps it
            // inside a narrow card.
            className="w-96 max-w-full"
          />
        }
      >
        <div className="overflow-x-auto">
          {/* Everything reads left, headers included. Ragged-right numbers are
              harder to compare than right-aligned ones, but tnum keeps the
              digits on a fixed pitch so the columns still line up, and one
              alignment across the table is easier to scan than two.
              Column gaps live on the table, not on individual cells. */}
          <table className="w-full text-left text-sm [&_td]:px-3 [&_th]:px-3 [&_td:first-child]:pl-0 [&_th:first-child]:pl-0 [&_td:last-child]:pr-0 [&_th:last-child]:pr-0">
            <thead>
              <tr className="text-left text-xs text-text-muted">
                <th className="pb-2 font-medium">{th("displayName", "Content type")}</th>
                <th className="pb-2 font-medium">Character</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">{th("cadencePerWeek", "Per week")}</th>
                <th className="pb-2 font-medium">{th("posts", "Posts")}</th>
                <th className="pb-2 font-medium">{th("medianViews", "Median views")}</th>
                <th className="pb-2 font-medium">{th("pctDead", "Suppression")}</th>
                <th className="pb-2 font-medium">{th("engRate", "Engagement")}</th>
                <th className="pb-2 font-medium">{th("momentumPct", "Trend")}</th>
                <th className="pb-2 font-medium">{th("score", "Score")}</th>
                <th className="pb-2 font-medium">{th("lastPostedAt", "Last post")}</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <TypeRow
                  key={t.contentType}
                  type={t}
                  onAction={(action) => setPending({ action, target: t })}
                />
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="py-6 text-center text-sm text-text-muted">
              No content types match those filters.
            </p>
          )}
        </div>
      </DashCard>

      {pending && (
        <ContentTypeLifecycleModal
          action={pending.action}
          target={pending.target}
          peers={peersFor(pending.target)}
          glpPerWeek={
            data.characters.find((c) => c.name === pending.target.character)?.glpPerWeek ??
            data.glpPerWeek
          }
          onClose={() => {
            setPending(null);
            // The server component re-renders with the new registry state; the
            // range slice this view is holding has to catch up with it.
            void load(range);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function TypeRow({
  type: t,
  onAction,
}: {
  type: ContentTypeRow;
  onAction: (action: LifecycleAction) => void;
}) {
  const collapsing = isCollapsing(t);

  return (
    <tr className="border-t border-border">
      <td className="py-2.5">
        <span className="font-medium">{t.displayName}</span>
        <span className="block font-mono text-[11px] text-text-muted">{t.contentType}</span>
      </td>
      <td className="py-2.5 whitespace-nowrap text-text-muted">
        {t.character.replace("Character ", "Char ")}
      </td>
      <td className="py-2.5">
        <StatusPill tone={LIFECYCLE_TONE[t.lifecycle]}>
          {t.lifecycle}
        </StatusPill>
      </td>
      <td className="py-2.5 tnum">
        {t.lifecycle === "live" ? (t.cadencePerWeek ?? 0) : "—"}
      </td>
      <td className="py-2.5 tnum">
        {t.posts}
        {t.confidence === "low" && t.posts > 0 && (
          <span className="ml-1 text-[11px] text-text-muted" title="Under 8 posts, the median swings on one hit">
            thin
          </span>
        )}
      </td>
      <td className="py-2.5 tnum">
        {t.medianViews === null ? "—" : compact(t.medianViews)}
      </td>
      <td
        className={cn("py-2.5 tnum", t.pctDead !== null && t.pctDead >= 50 && "text-danger")}
      >
        {t.pctDead === null ? "—" : `${t.pctDead}%`}
      </td>
      <td className="py-2.5 text-text-muted tnum">
        {t.engRate === null ? "—" : `${t.engRate}%`}
      </td>
      <td
        className={cn(
          "py-2.5 tnum",
          t.momentumPct !== null && t.momentumPct <= -25 && "text-danger",
          t.momentumPct !== null && t.momentumPct >= 25 && "text-ok",
        )}
      >
        {t.momentumPct === null ? "—" : `${t.momentumPct > 0 ? "+" : ""}${t.momentumPct}%`}
      </td>
      <td className="py-2.5 tnum">
        {t.score === null ? (
          "—"
        ) : (
          <span title={`Tier ${t.tier}, ${t.confidence} confidence`}>
            {t.score}
            <span className="ml-1 text-[11px] text-text-muted">{t.tier}</span>
          </span>
        )}
      </td>
      <td className="py-2.5 whitespace-nowrap text-text-muted tnum">
        {formatEtDate(t.lastPostedAt)}
      </td>
      <td className="py-2.5">
        <div className="flex items-center gap-1.5">
          {t.lifecycle === "live" ? (
            <ActionButton onClick={() => onAction("pause")}>Pause</ActionButton>
          ) : (
            <ActionButton onClick={() => onAction("resume")}>Resume</ActionButton>
          )}
          {t.lifecycle !== "retired" && (
            <ActionButton
              onClick={() => onAction("retire")}
              // Same signal as the accounts table: the button goes solid red
              // once the numbers say the lane is finished, not merely average.
              tone={collapsing ? "danger" : "quiet"}
              title={
                collapsing
                  ? "This lane is collapsing. Retire it"
                  : "Retire (drops out of the scheduler for good)"
              }
            >
              Retire
            </ActionButton>
          )}
        </div>
      </td>
    </tr>
  );
}

function ActionButton({
  onClick,
  tone = "quiet",
  title,
  children,
}: {
  onClick: () => void;
  tone?: "quiet" | "danger";
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors",
        tone === "danger"
          ? "bg-danger text-white hover:opacity-90"
          : "border border-border bg-card-raised text-text-muted hover:text-text-primary",
      )}
    >
      {children}
    </button>
  );
}
