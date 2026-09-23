import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { ACCOUNTS_TAG, DEVICES_TAG } from "@/lib/data/cache";
import { requireSession } from "@/lib/api-auth";
import { actingUserEmail, auditLog, validProfile } from "@/lib/data/writes";
import { parseAccountEdit, usernameTakenMessage } from "@/lib/data/account-rules";
import {
  AccountWriteError,
  getActiveCharacters,
  getEditableAccount,
  updateAccount,
  usernameTakenByOther,
  type EditableAccount,
} from "@/lib/data/account-writes";
import { getDeviceState } from "@/lib/data/device-writes";
import { PLATFORM_LABEL, toPlatform } from "@/lib/platform";

/**
 * POST /api/accounts/edit — the details half of Edit account (P14, Garreth
 * 2026-09-23): the handle, the character, the account's own phone number and
 * which phone it is on.
 *
 * Posting, the cadence and the warmup mode keep the routes they already have
 * (`pause`, `scheduler-override`, `warmup-mode`); the window calls those for
 * what changed there. The Profile name and the platform are never read from
 * the body, so no request can change them.
 *
 * PHYSICAL ONLY. A Cloud account is refused here, and the write itself is
 * filtered on the Physical fleet as well.
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
  if (!validProfile(body.profile)) {
    return NextResponse.json({ error: "invalid profile" }, { status: 400 });
  }
  const profile = body.profile;

  const parsed = parseAccountEdit(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const fields = parsed.fields;

  try {
    const userEmail = await actingUserEmail();
    const account = await getEditableAccount(profile);
    if (!account) return NextResponse.json({ error: "That account no longer exists." }, { status: 404 });
    if (account.delivery_mode !== "manual") {
      return NextResponse.json(
        { error: `${profile} is on the Cloud side, which is edited there.` },
        { status: 409 },
      );
    }
    if (!account.is_active) {
      return NextResponse.json({ error: `${profile} is retired.` }, { status: 409 });
    }

    // Only what actually differs is written, so a Save that changed nothing
    // here writes nothing and logs nothing.
    const columns: Parameters<typeof updateAccount>[1] = {};
    if (fields.username !== undefined && fields.username !== account.username) {
      const platform = toPlatform(account.platform);
      if (await usernameTakenByOther(fields.username, platform, account.id)) {
        return NextResponse.json(
          { error: usernameTakenMessage(fields.username, PLATFORM_LABEL[platform]), field: "username" },
          { status: 409 },
        );
      }
      columns.username = fields.username;
    }
    if (fields.character !== undefined && fields.character !== account.character) {
      // The scheduler plans per character, so a character that does not exist
      // or is switched off would leave the account with nothing ever planned.
      if (!(await getActiveCharacters()).includes(fields.character)) {
        return NextResponse.json(
          { error: `There is no character called "${fields.character}".` },
          { status: 400 },
        );
      }
      columns.character = fields.character;
    }
    if (fields.phoneNumber !== undefined && fields.phoneNumber !== account.phone_number) {
      columns.phone_number = fields.phoneNumber;
    }
    if (fields.deviceId !== undefined && fields.deviceId !== account.device_id) {
      if (fields.deviceId !== null) {
        const device = await getDeviceState(fields.deviceId);
        if (!device) return NextResponse.json({ error: "That phone no longer exists." }, { status: 404 });
        if (!device.is_active) {
          return NextResponse.json(
            { error: `${device.name} is switched off. Switch it back on before moving accounts onto it.`, field: "device" },
            { status: 409 },
          );
        }
      }
      columns.device_id = fields.deviceId;
    }

    if (Object.keys(columns).length === 0) {
      return NextResponse.json({ ok: true, changed: false });
    }

    const saved = await updateAccount(account.id, columns);
    const before = Object.fromEntries(
      Object.keys(columns).map((k) => [k, account[k as keyof EditableAccount]]),
    );
    await auditLog({ userEmail, action: "account_edit", target: profile, oldValue: before, newValue: columns });

    revalidateTag(ACCOUNTS_TAG, { expire: 0 });
    // A phone's page lists its accounts, and Proxies & numbers reads the
    // numbers through the phones.
    revalidateTag(DEVICES_TAG, { expire: 0 });
    return NextResponse.json({ ok: true, changed: true, account: saved });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Saving the account failed" },
      { status: err instanceof AccountWriteError ? err.status : 502 },
    );
  }
}
