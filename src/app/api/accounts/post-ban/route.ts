import { NextResponse, after } from "next/server";
import { revalidateTag } from "next/cache";
import { ACCOUNTS_TAG } from "@/lib/data/cache";
import { requireSession } from "@/lib/api-auth";
import { actingUserEmail, auditLog, getAccountState, validProfile } from "@/lib/data/writes";
import { insertNotification } from "@/lib/data/notifications";
import {
  factsFromSummary,
  retireBody,
  retireTitle,
  type PostBanSummary,
} from "@/lib/data/notification-copy";

/** Turn the workflow summary into a concise notification (severity/title/body). */
function summarize(profile: string, s: PostBanSummary) {
  const facts = factsFromSummary(s);
  return {
    severity: facts.hadError ? "warning" : "success",
    title: retireTitle(profile),
    body: retireBody(facts),
  };
}

async function callWorkflow(profile: string, userEmail: string, live: boolean) {
  const res = await fetch(process.env.N8N_POSTBAN_WEBHOOK_URL!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-webhook-secret": process.env.N8N_POSTBAN_WEBHOOK_SECRET!,
    },
    body: JSON.stringify({
      "Profile name": profile,
      "Report email": userEmail,
      Mode: live ? "Live (perform cleanup)" : "Dry run (report only)",
    }),
    signal: AbortSignal.timeout(60_000),
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Post-Ban workflow returned HTTP ${res.status}`);
  try {
    return JSON.parse(text) as PostBanSummary & { subject?: string; html?: string };
  } catch {
    return { raw: text } as unknown as PostBanSummary;
  }
}

export async function POST(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  let body: { profile?: unknown; mode?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  if (!validProfile(body.profile)) {
    return NextResponse.json({ error: "invalid profile" }, { status: 400 });
  }
  const live = body.mode === "live";
  const profile = body.profile;

  if (!process.env.N8N_POSTBAN_WEBHOOK_URL || !process.env.N8N_POSTBAN_WEBHOOK_SECRET) {
    return NextResponse.json(
      {
        error: "Post-Ban webhook is not configured yet (n8n workflow needs its webhook activated).",
      },
      { status: 503 },
    );
  }

  let userEmail: string;
  try {
    userEmail = await actingUserEmail();
    const state = await getAccountState(profile);
    if (!state) return NextResponse.json({ error: "account not found" }, { status: 404 });
    if (live && !state.is_active && state.cleanedUp) {
      return NextResponse.json(
        { error: "account is already retired and cleaned up" },
        { status: 409 },
      );
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "post-ban precheck failed" },
      { status: 502 },
    );
  }

  // Dry run: synchronous so the operator sees the report in the modal.
  if (!live) {
    try {
      const summary = await callWorkflow(profile, userEmail, false);
      await auditLog({
        userEmail,
        action: "post_ban_trigger",
        target: profile,
        newValue: { mode: "Dry run (report only)" },
      });
      return NextResponse.json({ ok: true, profile, mode: "dry", live: false, summary });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "dry run failed" },
        { status: 502 },
      );
    }
  }

  // Live run: fire in the background so the operator can move on; a notification
  // lands in the bell when the workflow completes.
  after(async () => {
    try {
      const summary = await callWorkflow(profile, userEmail, true);
      const n = summarize(profile, summary);
      await insertNotification({
        type: "retire",
        severity: n.severity,
        title: n.title,
        body: n.body,
        target: profile,
        // The whole summary, not just the sentence built from it: the copy is
        // lossy by design and this is the only place the run is written down.
        meta: { mode: "Live", triggeredBy: userEmail, summary },
      });
      await auditLog({
        userEmail,
        action: "post_ban_trigger",
        target: profile,
        newValue: { mode: "Live (perform cleanup)", summary: n.body },
      });
      revalidateTag(ACCOUNTS_TAG, { expire: 0 });
    } catch (err) {
      await insertNotification({
        type: "retire",
        severity: "critical",
        title: retireTitle(profile, true),
        body: `${err instanceof Error ? err.message : "The run failed for an unknown reason"}, and nothing was changed`,
        target: profile,
      });
    }
  });

  return NextResponse.json(
    { ok: true, profile, mode: "live", live: true, started: true },
    { status: 202 },
  );
}
