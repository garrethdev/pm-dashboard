import { attempt, bad, body, guard, str } from "@/server/carousel/http";
import { getDeckRow } from "@/server/carousel/repo/batches";
import { changeTrack, discardDeck, regenerateDeck, retryDeck } from "@/server/carousel/services/runner";

/** One deck's presses: Regenerate (with feedback), Retry, Discard, Change track. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string; action: string }> }) {
  const g = await guard();
  if (g.denied) return g.denied;
  const { id, action } = await params;
  const deck = await getDeckRow(id);
  if (!deck) return bad("Deck not found", 404);
  const b = await body(req);
  switch (action) {
    case "regenerate":
      if (["writing", "rendering", "discarded"].includes(deck.status)) return bad("This deck cannot be regenerated right now", 409);
      return attempt(g.email, "carousel.deck.regenerate", id, () => regenerateDeck(deck.brief_id, id, str(b.feedback) || null), { feedback: str(b.feedback) });
    case "retry":
      if (deck.status !== "failed") return bad("Only a failed deck can be retried", 409);
      return attempt(g.email, "carousel.deck.retry", id, () => retryDeck(deck.brief_id, id));
    case "discard":
      return attempt(g.email, "carousel.deck.discard", id, () => discardDeck(deck.brief_id, id));
    case "track": {
      const track = str(b.track, 200).trim();
      if (!track) return bad("A track is required");
      return attempt(g.email, "carousel.deck.track", id, () => changeTrack(deck.brief_id, id, track), { track });
    }
  }
  return bad("Unknown action", 404);
}

export const dynamic = "force-dynamic";
