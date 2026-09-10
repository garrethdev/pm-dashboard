import { NextResponse, after } from "next/server";
import { revalidateTag } from "next/cache";
import { ACCOUNTS_TAG } from "@/lib/data/cache";
import { requireSession } from "@/lib/api-auth";
import { actingUserEmail, auditLog, getAccountState, validProfile } from "@/lib/data/writes";
import { insertNotification } from "@/lib/data/notifications";
import {
  factsFromSummary,
  isPostBanSummary,
  retireBody,
  retireTitle,
  retireUnverifiedBody,
  type PostBanSummary,
} from "@/lib/data/notification-copy";

/**
 * What came back from the webhook.
 *
 * `unverified` is the case this route used to lack. A 2xx whose body is not a
 * summary — n8n's own "Workflow was started" acknowledgement, an HTML error
 * page, a truncated response — was previously coerced into `{ raw: text }` and
 * then read as a summary in which every field happened to be absent. Absent
 * fields mean "nothing needed doing", so the operator was told the account was
 * already clean. A 202 is an acknowledgement, not a result.
 */
type WorkflowResult =
  | { kind: "summary"; summary: PostBanSummary & { subject?: string; html?: string } }
  | { kind: "unverified"; reason: string };

/** Turn the workflow summary into a concise notification (severity/title/body). */
function summarize(profile: string, s: PostBanSummary) {
  const facts = factsFromSummary(s);
  return {
    severity: facts.hadError ? "warning" : "success",
    title: retireTitle(profile),
    body: retireBody(facts),
  };
}

async function callWorkflow(
  profile: string,
  userEmail: string,
  live: boolean,
): Promise<WorkflowResult> {
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
  // A non-2xx on a LIVE run is still not proof that nothing happened — the
  // request reached n8n. The caller decides how loudly to say so.
  if (!res.ok) throw new Error(`Post-Ban workflow returned HTTP ${res.status}`);

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { kind: "unverified", reason: "The workflow replied with something that is not a report" };
  }
  if (!isPostBanSummary(parsed)) {
    return {
      kind: "unverified",
      reason: "The workflow acknowledged the request but did not report what it did",
    };
  }
  return { kind: "summary", summary: parsed as PostBanSummary & { subject?: string; html?: string } };
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
      const result = await callWorkflow(profile, userEmail, false);
      await auditLog({
        userEmail,
        action: "post_ban_trigger",
        target: profile,
        newValue: { mode: "Dry run (report only)", reported: result.kind },
      });
      // A dry run that produced no report must not render as an empty,
      // reassuring one — Execute stays disabled until a real report lands.
      if (result.kind === "unverified") {
        return NextResponse.json({ error: result.reason }, { status: 502 });
      }
      return NextResponse.json({
        ok: true,
        profile,
        mode: "dry",
        live: false,
        summary: result.summary,
      });
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
      const result = await callWorkflow(profile, userEmail, true);

      // Reached n8n, came back unreadable. The cleanup may have run in full, in
      // part, or not at all, and there is no way to tell from here — so this is
      // reported as an open question needing reconciliation, not as a result.
      if (result.kind === "unverified") {
        await insertNotification({
          type: "retire",
          severity: "warning",
          title: `${profile} retire needs checking`,
          body: retireUnverifiedBody(result.reason),
          target: profile,
          meta: { mode: "Live", triggeredBy: userEmail, verified: false },
        });
        await auditLog({
          userEmail,
          action: "post_ban_trigger",
          target: profile,
          newValue: { mode: "Live (perform cleanup)", outcome: "unverified" },
        });
        revalidateTag(ACCOUNTS_TAG, { expire: 0 });
        return;
      }

      const n = summarize(profile, result.summary);
      await insertNotification({
        type: "retire",
        severity: n.severity,
        title: n.title,
        body: n.body,
        target: profile,
        // The whole summary, not just the sentence built from it: the copy is
        // lossy by design and this is the only place the run is written down.
        meta: { mode: "Live", triggeredBy: userEmail, verified: true, summary: result.summary },
      });
      await auditLog({
        userEmail,
        action: "post_ban_trigger",
        target: profile,
        newValue: { mode: "Live (perform cleanup)", summary: n.body },
      });
      revalidateTag(ACCOUNTS_TAG, { expire: 0 });
    } catch (err) {
      // Timeout, network drop or a non-2xx. The request WAS sent, so "nothing
      // was changed" — which this used to claim — is a guess, and the one guess
      // that stops anyone going to look.
      await insertNotification({
        type: "retire",
        severity: "critical",
        title: `${profile} retire needs checking`,
        body: retireUnverifiedBody(
          err instanceof Error ? err.message : "The run failed for an unknown reason",
        ),
        target: profile,
        meta: { mode: "Live", triggeredBy: userEmail, verified: false },
      });
    }
  });

  return NextResponse.json(
    { ok: true, profile, mode: "live", live: true, started: true },
    { status: 202 },
  );
}
