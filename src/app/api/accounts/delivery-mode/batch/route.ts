import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { ACCOUNTS_TAG, DEVICES_TAG } from "@/lib/data/cache";
import { accountDetailTag } from "@/lib/data/account-detail";
import { requireSession } from "@/lib/api-auth";
import { parseBatchMoves } from "@/lib/data/move-rules";
import { actingUserEmail, BatchMoveRefusal, moveAccountsOntoPhones } from "@/lib/data/writes";

/**
 * POST /api/accounts/delivery-mode/batch — PF-15, the save behind the batch
 * move in Settings (design ticket P10).
 *
 * Body: `{ moves: [{ profile, deviceId }] }`, only the rows that are moving;
 * the dialog leaves out the ones set to "Not moving".
 *
 * All or nothing: every account moves onto its phone, or none does and the
 * answer names the account that stopped it (`profile`), so the dialog can
 * point at that row. The rules are the single move's (`../route.ts`): Cloud
 * accounts only, never a retired one, never onto a missing or switched-off
 * phone, posting_paused untouched, one audit row per account.
 */
export async function POST(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  let body: { moves?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const parsed = parseBatchMoves(body.moves);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { moves } = parsed;

  try {
    const userEmail = await actingUserEmail();
    await moveAccountsOntoPhones(moves, userEmail);

    revalidateTag(ACCOUNTS_TAG, { expire: 0 });
    revalidateTag(DEVICES_TAG, { expire: 0 });
    for (const m of moves) revalidateTag(accountDetailTag(m.profile), { expire: 0 });
    return NextResponse.json({ ok: true, moved: moves.length });
  } catch (err) {
    if (err instanceof BatchMoveRefusal) {
      return NextResponse.json({ error: err.message, profile: err.profile }, { status: 409 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "move failed" },
      { status: 502 },
    );
  }
}
