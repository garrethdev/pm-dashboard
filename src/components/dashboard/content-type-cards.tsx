"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Film, Images } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusPill, type PillTone } from "@/components/ui/pill";
import type { CharacterTypes, ContentTypeRow, Lifecycle } from "@/lib/data/content-types";
import { cn } from "@/lib/utils";

/**
 * One card per character, three across. The card is the browsing surface: a
 * preview of what the lane actually looks like, the numbers for the lane on
 * show, and the character's other lanes underneath to switch to.
 *
 * Retired lanes are left out entirely. They are not part of what the character
 * posts, they have no numbers to compare, and a row of em-dashes was the
 * loudest thing on the card. They stay reachable from the table below.
 *
 * The preview is a stored frame, not the live media URL — several render
 * buckets are private and hand out signed URLs that expire, so a card built on
 * those would rot within days. See content_type_thumbnails.
 */

const compact = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1000).toFixed(1)}k` : String(v);

export const LIFECYCLE_TONE: Record<Lifecycle, PillTone> = {
  live: "ok",
  paused: "warn",
  retired: "gray",
};

export function ContentTypeCards({
  characters,
  glpPerWeek,
}: {
  characters: CharacterTypes[];
  glpPerWeek: number;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {characters.map((c) => (
        <CharacterCard key={c.name} character={c} glpPerWeek={glpPerWeek} />
      ))}
    </div>
  );
}

function CharacterCard({
  character,
  glpPerWeek,
}: {
  character: CharacterTypes;
  glpPerWeek: number;
}) {
  const types = character.types.filter((t) => t.lifecycle !== "retired");
  const [index, setIndex] = useState(0);
  const current = types[Math.min(index, types.length - 1)];

  if (!current) {
    return (
      <Card className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold">{character.name}</h3>
        <p className="text-sm text-text-muted">No content types in rotation.</p>
      </Card>
    );
  }

  const step = (delta: number) => setIndex((i) => (i + delta + types.length) % types.length);

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="truncate text-sm font-semibold">{character.name}</h3>
        <StatusPill tone={character.allocated === glpPerWeek ? "neutral" : "danger"} dot={false}>
          {character.allocated} / {glpPerWeek} per week
        </StatusPill>
      </div>

      {/* Preview, flanked by the flip controls. */}
      <div className="flex items-center gap-1">
        <FlipButton dir="prev" onClick={() => step(-1)} disabled={types.length < 2} />
        <Preview type={current} />
        <FlipButton dir="next" onClick={() => step(1)} disabled={types.length < 2} />
      </div>

      {/* The lane on show. */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <h4 className="min-w-0 text-sm font-semibold">{current.displayName}</h4>
          <StatusPill tone={LIFECYCLE_TONE[current.lifecycle]} dot={false}>
            {current.lifecycle}
          </StatusPill>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <Stat
            label="Median Views"
            value={current.medianViews === null ? "—" : compact(current.medianViews)}
          />
          <Stat
            label="Suppression Rate"
            value={current.pctDead === null ? "—" : `${current.pctDead}%`}
            tone={current.pctDead !== null && current.pctDead >= 50 ? "danger" : undefined}
          />
          <Stat
            label="Engagement Rate"
            value={current.engRate === null ? "—" : `${current.engRate}%`}
          />
          <Stat
            label="Trend"
            value={
              current.momentumPct === null
                ? "—"
                : `${current.momentumPct > 0 ? "+" : ""}${current.momentumPct}%`
            }
            tone={
              current.momentumPct === null
                ? undefined
                : current.momentumPct >= 10
                  ? "ok"
                  : current.momentumPct <= -25
                    ? "danger"
                    : undefined
            }
          />
        </div>
      </div>

      {/* Every lane, always in the same order — only the selected row moves.
          A list that reshuffled on each click made the card hard to scan. */}
      <table className="w-full border-t border-border text-sm">
        <thead>
          <tr className="text-left text-[11px] text-text-muted">
            <th className="px-2 pt-2 pb-1 font-medium">Content Type</th>
            <th className="px-2 pt-2 pb-1 text-right font-medium">Median Views</th>
          </tr>
        </thead>
        <tbody>
          {types.map((t) => {
            const selected = t.contentType === current.contentType;
            return (
              <tr
                key={t.contentType}
                onClick={() => setIndex(types.indexOf(t))}
                aria-selected={selected}
                className={cn(
                  "cursor-pointer transition-colors",
                  selected ? "bg-accent-soft" : "hover:bg-card-raised",
                )}
              >
                <td className="rounded-l-nested px-2 py-1.5">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        t.lifecycle === "live" ? "bg-ok" : "bg-warn",
                      )}
                      aria-hidden
                    />
                    <span
                      className={cn(
                        "min-w-0 truncate text-xs",
                        selected ? "font-medium text-accent" : "text-text-muted",
                      )}
                    >
                      {t.displayName}
                    </span>
                  </span>
                </td>
                <td
                  className={cn(
                    "rounded-r-nested px-2 py-1.5 text-right text-xs tnum",
                    selected ? "font-medium text-accent" : "text-text-primary",
                  )}
                >
                  {t.medianViews === null ? "—" : compact(t.medianViews)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

/** Phone-shaped preview. object-cover on a 9:16 box keeps every lane the same
 *  size whatever the render actually is. */
function Preview({ type }: { type: ContentTypeRow }) {
  const Shape = type.mediaShape === "image_carousel" ? Images : Film;
  return (
    <div className="relative mx-auto aspect-[9/16] w-full max-w-[10rem] min-w-0 flex-1 overflow-hidden rounded-nested border border-border bg-bg">
      {type.thumbUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Supabase storage, no loader needed
        <img
          src={type.thumbUrl}
          alt={`${type.displayName} preview`}
          loading="lazy"
          className={cn(
            "size-full object-cover object-top",
            type.lifecycle !== "live" && "opacity-50 grayscale",
          )}
        />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-2 text-text-muted">
          <Shape className="size-6" />
          <span className="px-3 text-center text-[11px] leading-tight">No preview captured</span>
        </div>
      )}
    </div>
  );
}

function FlipButton({
  dir,
  onClick,
  disabled,
}: {
  dir: "prev" | "next";
  onClick: () => void;
  disabled: boolean;
}) {
  const Icon = dir === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "prev" ? "Previous content type" : "Next content type"}
      className="flex size-7 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-card-raised hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:bg-transparent"
    >
      <Icon className="size-4" />
    </button>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "danger" }) {
  return (
    <div className="min-w-0">
      <p
        className={cn(
          "truncate text-sm font-semibold tnum",
          tone === "danger" ? "text-danger" : tone === "ok" ? "text-ok" : "text-text-primary",
        )}
      >
        {value}
      </p>
      {/* Wraps rather than truncates: "Suppression Rate" does not fit a quarter
          of the card on one line, and a clipped label names nothing. */}
      <p className="text-[11px] leading-tight text-text-muted">{label}</p>
    </div>
  );
}
