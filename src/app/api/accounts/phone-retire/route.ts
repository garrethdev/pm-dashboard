import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { ACCOUNTS_TAG } from "@/lib/data/cache";
import { requireSession } from "@/lib/api-auth";
import { actingUserEmail, auditLog, validProfile } from "@/lib/data/writes";
import { RetireError, getRetirePreview, retirePhoneAccount } from "@/lib/data/ban-cleanups";

/**
 * /api/accounts/phone-retire — retiring a banned account on a REAL phone
 * (PF-11, design P8).
 *
 *  - GET ?profile=… is what the dialog says before the hold: the phone, how
 *    many posts go back to the pool, whether other accounts still use the
 *    proxy. It changes nothing.
 *  - POST { profile, retireProxy } retires it.
 *
 * The Post-Ban robot is never called from here. There is no dry run either,
 * because there is no robot to ask (P8): the dialog's own preview is the
 * report, and the app's half is one database call that lands whole or not at
 * all.
 */

function failure(err: unknown, fallback: string) {
  if (err instanceof RetireError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  return NextResponse.json(
    { error: err instanceof Error ? err.message : fallback },
    { status: 502 },
  );
}

export async function GET(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  const profile = new URL(request.url).searchParams.get("profile");
  if (!validProfile(profile)) {
    return NextResponse.json({ error: "invalid profile" }, { status: 400 });
  }
  try {
    return NextResponse.json(await getRetirePreview(profile));
  } catch (err) {
    return failure(err, "could not read the account");
  }
}

export async function POST(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  let body: { profile?: unknown; retireProxy?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  if (!validProfile(body.profile)) {
    return NextResponse.json({ error: "invalid profile" }, { status: 400 });
  }
  if (typeof body.retireProxy !== "boolean") {
    return NextResponse.json({ error: "retireProxy must be true or false" }, { status: 400 });
  }
  const profile = body.profile;

  try {
    const userEmail = await actingUserEmail();
    const result = await retirePhoneAccount(profile, body.retireProxy, userEmail);
    if (!result.already) {
      await auditLog({
        userEmail,
        action: "phone_retire",
        target: profile,
        newValue: { retireProxy: body.retireProxy, ...result },
      });
    }
    revalidateTag(ACCOUNTS_TAG, { expire: 0 });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return failure(err, "retire failed");
  }
}
