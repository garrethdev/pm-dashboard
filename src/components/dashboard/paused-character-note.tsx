import { DashCard } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/pill";
import type { PausedCharacter } from "@/lib/data/inventory";

/**
 * Characters that exist but are switched off.
 *
 * Deliberately carries no demand, no shortfall and no produce-to figure. Every
 * number on this page is kept in step with the Mon/Fri digest, and a paused
 * character has genuinely zero demand — the scheduler is not planning for it —
 * so folding it into those totals would put the dashboard and the email into
 * disagreement over a character that is not posting.
 *
 * What it does answer is the question the rest of the page cannot: this
 * character is coming, and here is what is already sitting ready for it.
 */
export function PausedCharacterNote({ characters = [] }: { characters?: PausedCharacter[] }) {
  // Defaulted: belt-and-braces against a cache entry written before this field
  // existed. The tag suffix is the real fix; this stops a stale one crashing.
  if (characters.length === 0) return null;

  return (
    <DashCard title="Waiting to be switched on">
      <div className="flex flex-col gap-3">
        {characters.map((c) => (
          <div key={c.character} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{c.character}</span>
            <StatusPill tone="gray">
              {c.accounts} {c.accounts === 1 ? "account" : "accounts"}, all paused
            </StatusPill>
            <span className="text-text-muted">
              {c.lanes.length === 0
                ? "no content lane yet"
                : c.lanes
                    .map((l) => `${l.pool} ${l.contentType.replace(/_/g, " ")} ready`)
                    .join(", ")}
            </span>
          </div>
        ))}
        <p className="text-xs text-text-muted">
          Not counted in demand, supply or the production order above — a paused character has no
          demand, and those figures track the Mon/Fri digest exactly.
        </p>
      </div>
    </DashCard>
  );
}
