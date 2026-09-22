import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { ACCOUNTS_TAG, DEVICES_TAG } from "@/lib/data/cache";
import { requireSession } from "@/lib/api-auth";
import { actingUserEmail, auditLog } from "@/lib/data/writes";
import {
  parseNewAccount,
  profileTakenMessage,
  usernameTakenMessage,
} from "@/lib/data/account-rules";
import {
  AccountWriteError,
  createAccount,
  getActiveCharacters,
  profileHolder,
  usernameTaken,
} from "@/lib/data/account-writes";
import { assignRefusal } from "@/lib/data/device-rules";
import { countDeviceAccounts, getDeviceState } from "@/lib/data/device-writes";
import { PLATFORM_LABEL } from "@/lib/platform";

/**
 * POST /api/accounts — add an account by hand (PF-21).
 *
 * Until now an account row was only ever made by the n8n provisioning
 * workflow, which left the handle, the character, the made-on date and the
 * active flag to be typed into the database afterwards. Accounts on real
 * iPhones are not provisioned by anything, so there has to be a way to write
 * the row from the app, complete, in one go.
 *
 * The Profile name is the whole reason this route is careful. Everything
 * downstream — posts, health, analytics, the calendar, several database views
 * — finds an account by `geelark_profile`, so a second "Profile 19" would
 * silently merge two accounts' histories. It is checked here for a useful
 * refusal, and the table's unique index refuses it again underneath.
 */
export async function POST(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
    if (!body || typeof body !== "object") throw new Error("not an object");
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const parsed = parseNewAccount(body, { today });
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const fields = parsed.fields;

  try {
    const userEmail = await actingUserEmail();

    // The character has to be one that exists and is switched on: the
    // scheduler plans per character, and a typo would make an account nothing
    // ever plans for and nobody would see why.
    const characters = await getActiveCharacters();
    if (!characters.includes(fields.character)) {
      return NextResponse.json(
        { error: `There is no character called "${fields.character}".` },
        { status: 400 },
      );
    }

    const holder = await profileHolder(fields.profile);
    if (holder) {
      return NextResponse.json(
        { error: profileTakenMessage(fields.profile, holder), field: "profile" },
        { status: 409 },
      );
    }

    if (await usernameTaken(fields.username, fields.platform)) {
      return NextResponse.json(
        {
          error: usernameTakenMessage(fields.username, PLATFORM_LABEL[fields.platform]),
          field: "username",
        },
        { status: 409 },
      );
    }

    // A phone is optional, but if one is named it has to be a phone that can
    // take the account — the same three rules the device page enforces.
    if (fields.deviceId !== null) {
      const device = await getDeviceState(fields.deviceId);
      if (!device) {
        return NextResponse.json({ error: "That phone no longer exists." }, { status: 404 });
      }
      const refusal = assignRefusal({
        deviceId: device.id,
        deviceName: device.name,
        deviceActive: device.is_active,
        heldCount: await countDeviceAccounts(device.id),
        accountActive: true,
        accountDeviceId: null,
      });
      if (refusal) return NextResponse.json({ error: refusal, field: "device" }, { status: 409 });
    }

    const account = await createAccount(fields, { userEmail, today });

    // No re-count: a phone has no maximum any more (Garreth, 2026-09-22), so
    // there is no longer such a thing as it filling up while you typed.
    const deviceError: string | null = null;

    await auditLog({
      userEmail,
      action: "account_create",
      target: account.geelark_profile,
      newValue: account,
    });

    revalidateTag(ACCOUNTS_TAG, { expire: 0 });
    // The phone's own page lists its accounts, and the by-phone view groups by
    // them, so both go stale whether or not a phone was named — the new row
    // shows under "Not on a phone" when it was not.
    revalidateTag(DEVICES_TAG, { expire: 0 });

    return NextResponse.json({
      ok: true,
      id: account.id,
      profile: account.geelark_profile,
      deviceError,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Saving the account failed" },
      { status: err instanceof AccountWriteError ? err.status : 502 },
    );
  }
}
