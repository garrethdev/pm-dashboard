import { describe, expect, it } from "vitest";
import { upstreamMessage } from "@/lib/data/upstream-error";

/**
 * The copy on a panel that could not load.
 *
 * This is tested because the old version was wrong in a way nobody could see
 * from the code: it said "Supabase unreachable" for every failure, including
 * the common one where Supabase was working perfectly and merely slow. On
 * 2026-09-08 that sent Garreth looking for an outage that had not happened.
 *
 * So the thing being protected here is a claim, not a behaviour: **the screen
 * must not assert that something is down unless it knows that.**
 */

/** What `AbortSignal.timeout()` actually throws — a DOMException named
 *  TimeoutError, which is NOT an instance of Error. Getting that wrong is how
 *  the timeout case silently falls through to the generic one. */
function ourTimeout(): unknown {
  return new DOMException("The operation was aborted due to timeout", "TimeoutError");
}

describe("upstreamMessage", () => {
  it("does not claim the far end is down when we gave up waiting", () => {
    const message = upstreamMessage(ourTimeout(), "Supabase");
    expect(message).not.toMatch(/unreachable|down|offline/i);
    expect(message).toContain("took too long");
    expect(message).toContain("still running");
  });

  it("tells you what to do about a timeout", () => {
    expect(upstreamMessage(ourTimeout(), "Supabase")).toContain("Refresh");
  });

  it("explains the usual cause, since it is not obvious", () => {
    // The real cause is a burst — a save expires every cached figure and every
    // panel refetches at once. Without this the message is a dead end.
    expect(upstreamMessage(ourTimeout(), "Supabase")).toMatch(/several panels reload at once/);
  });

  it("quotes the status code when the far end answered with an error", () => {
    const message = upstreamMessage(new Error("supabase HTTP 503 on accounts"), "Supabase");
    expect(message).toContain("503");
    expect(message).toContain("Supabase answered with an error");
  });

  it("handles an RPC failure the same way", () => {
    expect(upstreamMessage(new Error("supabase RPC HTTP 500 on analytics_rollup"), "Supabase")).toContain(
      "500",
    );
  });

  it("passes an unrecognised failure through without inventing a cause", () => {
    const message = upstreamMessage(new Error("fetch failed"), "n8n");
    expect(message).toContain("fetch failed");
    expect(message).not.toMatch(/unreachable|took too long/i);
  });

  it("survives something thrown that is not an Error at all", () => {
    expect(upstreamMessage("just a string", "n8n")).toContain("just a string");
    expect(upstreamMessage(null, "n8n")).toBe("n8n could not be read.");
    expect(upstreamMessage(undefined, "n8n")).toBe("n8n could not be read.");
  });

  it("uses the name it was given, so each panel names its own upstream", () => {
    expect(upstreamMessage(ourTimeout(), "n8n")).toContain("n8n");
    expect(upstreamMessage(ourTimeout(), "The proxy and phone data")).toContain(
      "The proxy and phone data",
    );
  });
});
