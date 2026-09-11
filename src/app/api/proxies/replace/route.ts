import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { GEELARK_PHONES_TAG, PROXYCHEAP_PROXIES_TAG } from "@/lib/data/cache";
import { requireSession } from "@/lib/api-auth";
import { fetchAllPhones } from "@/lib/data/geelark";
import { addProxyToLibrary, explainGeelarkError, setPhoneProxy } from "@/lib/data/geelark-writes";
import { insertNotification } from "@/lib/data/notifications";
import { fetchProxyCredentials } from "@/lib/data/proxycheap";
import { parsePastedProxy, type PastedProxy } from "@/lib/data/proxy-paste";
import { actingUserEmail, auditLog, getAccountState, validProfile } from "@/lib/data/writes";

/**
 * POST /api/proxies/replace — point one phone at a different proxy.
 *
 * Two ways to name the target, exactly one per request:
 *
 * - `proxyCheapId` — picked from the spare list. The browser never sees a
 *   password; the server resolves credentials from proxy-cheap at write time.
 * - `raw` — a pasted `IP:PORT:USERNAME:PASSWORD` line, which is what the SOP
 *   already produces and the only route available for a proxy bought outside
 *   proxy-cheap. Credentials do travel from the browser here, which is the
 *   unavoidable cost of letting someone paste; it is their own clipboard, and
 *   the request is already behind the session gate.
 *
 * Reads are deliberately live rather than cached. The guards below decide
 * whether a swap is safe, and a phone list up to 15 minutes old could clear a
 * proxy that another session attached two minutes ago.
 */
export async function POST(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  let body: { profile?: unknown; proxyCheapId?: unknown; raw?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (!validProfile(body.profile)) {
    return NextResponse.json({ error: "invalid profile" }, { status: 400 });
  }
  const profile = body.profile;

  const hasId = body.proxyCheapId !== undefined && body.proxyCheapId !== null;
  const hasRaw = typeof body.raw === "string" && body.raw.trim() !== "";
  if (hasId === hasRaw) {
    return NextResponse.json(
      { error: "send either proxyCheapId or raw, not both" },
      { status: 400 },
    );
  }

  let proxyCheapId: number | null = null;
  let pasted: PastedProxy | null = null;
  if (hasId) {
    const id = body.proxyCheapId;
    if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { error: "proxyCheapId must be a positive integer" },
        { status: 400 },
      );
    }
    proxyCheapId = id;
  } else {
    pasted = parsePastedProxy(body.raw as string);
    if (!pasted) {
      return NextResponse.json({ error: "expected IP:PORT:USERNAME:PASSWORD" }, { status: 400 });
    }
  }

  try {
    const userEmail = await actingUserEmail();

    const state = await getAccountState(profile);
    if (!state) return NextResponse.json({ error: "account not found" }, { status: 404 });
    // Same rule as pause: a retired account is not a thing to configure. Its
    // phone is normally deleted by post-ban cleanup anyway, and the useful move
    // on a banned account's proxy is to release it, not re-point it.
    if (!state.is_active) {
      return NextResponse.json(
        { error: "cannot replace the proxy on a retired account" },
        { status: 409 },
      );
    }

    const [phones, looked] = await Promise.all([
      fetchAllPhones(),
      proxyCheapId === null ? Promise.resolve(null) : fetchProxyCredentials(proxyCheapId),
    ]);

    const phone = phones.find((p) => p.serialName === profile);
    if (!phone) {
      return NextResponse.json({ error: `no GeeLark phone named ${profile}` }, { status: 404 });
    }

    if (proxyCheapId !== null) {
      if (!looked) {
        return NextResponse.json(
          {
            error: "that proxy is not on proxy-cheap, or has no usable credentials",
          },
          { status: 404 },
        );
      }
      if (looked.status !== "ACTIVE") {
        return NextResponse.json(
          { error: `that proxy is ${looked.status.toLowerCase()}, not active` },
          { status: 409 },
        );
      }
    }

    // A pasted line is taken at its word for host and credentials. It is NOT
    // checked against the proxy-cheap list: a proxy bought anywhere else is a
    // legitimate paste, and refusing one because we cannot see the invoice
    // would break the only route that covers it.
    const target = looked ?? pasted!;
    const endpoint = `${target.server}:${target.port}`;
    const current = phone.proxy ? `${phone.proxy.server}:${phone.proxy.port}` : null;
    if (current === endpoint) {
      return NextResponse.json({ error: "that phone is already on this proxy" }, { status: 409 });
    }

    // Two phones behind one residential IP is the single most legible pattern a
    // platform can see across accounts, so this is a hard stop rather than a
    // warning. GeeLark itself will happily allow it.
    const taken = phones.find(
      (p) =>
        p.serialName !== profile && p.proxy && `${p.proxy.server}:${p.proxy.port}` === endpoint,
    );
    if (taken) {
      return NextResponse.json(
        { error: `that proxy is already assigned to ${taken.serialName}` },
        { status: 409 },
      );
    }

    // The write is two calls, and which one failed changes what the operator
    // has to do next — so they are reported separately rather than collapsed
    // into one "it didn't work".
    //
    // Stage 1: library first, then attach by id — never an inline proxyConfig.
    // See the note in geelark-writes.ts: an inline config is invisible in
    // GeeLark's Proxy tab and is what produced the drift this feature exists to
    // stop. GeeLark connectivity-tests the proxy here, so a dead endpoint or a
    // mistyped password fails at this point, before the phone is touched.
    let proxyId: string;
    try {
      proxyId = await addProxyToLibrary({
        scheme: "socks5",
        server: target.server,
        port: target.port,
        username: target.username,
        password: target.password,
      });
    } catch (err) {
      return NextResponse.json(
        { stage: "check", error: explainGeelarkError(err), stillOn: current },
        { status: 502 },
      );
    }

    // Stage 2: the call that actually does the job. A failure here is the one
    // that matters most — the proxy checked out, so it reads like success, but
    // the phone is what the operator came to change.
    try {
      await setPhoneProxy(phone.id, proxyId);
    } catch (err) {
      // Ask GeeLark where the phone actually ended up rather than assuming.
      // A timeout can land after the server has already applied the change, and
      // telling someone their swap failed when it did not is its own outage.
      const after = await fetchAllPhones().catch(() => null);
      const now = after?.find((p) => p.serialName === profile);
      const landed = now?.proxy ? `${now.proxy.server}:${now.proxy.port}` : null;

      if (landed !== endpoint) {
        revalidateTag(GEELARK_PHONES_TAG, { expire: 0 });
        return NextResponse.json(
          {
            stage: "attach",
            error: explainGeelarkError(err),
            // What the phone is on right now, read back just now. null means
            // GeeLark could not be reached for the re-read either.
            stillOn: after ? landed : undefined,
          },
          { status: 502 },
        );
      }
      // It did land; fall through and report the success it actually was.
    }

    await auditLog({
      userEmail,
      action: "proxy_replace",
      target: profile,
      oldValue: { proxy: current },
      // Never the password: the audit log is read by people, and a credential
      // in it outlives the swap it documents.
      newValue: {
        proxy: endpoint,
        proxyCheapId,
        geelarkProxyId: proxyId,
        source: proxyCheapId === null ? "pasted" : "picked",
      },
    });

    // The bell, so the rest of the team sees it. The operator who did it
    // already has the on-screen confirmation; this is for everyone else, who
    // would otherwise find an account on a different IP with no explanation.
    // Never fatal — insertNotification swallows its own failures — and the
    // audit-log row above is the durable record either way.
    await insertNotification({
      type: "proxy_replace",
      severity: "info",
      title: `${profile} moved to a new proxy`,
      body: `${current ?? "no proxy"} → ${endpoint}, by ${userEmail}`,
      target: profile,
      meta: { from: current, to: endpoint, proxyCheapId, by: userEmail },
    });

    revalidateTag(GEELARK_PHONES_TAG, { expire: 0 });
    revalidateTag(PROXYCHEAP_PROXIES_TAG, { expire: 0 });

    return NextResponse.json({
      ok: true,
      profile,
      from: current,
      to: endpoint,
    });
  } catch (err) {
    return NextResponse.json(
      // Anything that failed before either write — reading the phone list,
      // proxy-cheap, or Supabase. Nothing was changed.
      {
        stage: "check",
        error: err instanceof Error ? err.message : "proxy replace failed",
      },
      { status: 502 },
    );
  }
}
