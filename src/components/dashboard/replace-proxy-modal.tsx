"use client";

import { useEffect, useRef, useState } from "react";
import { Globe, Loader2, X } from "@/components/ui/icons";
import { FilterPills } from "@/components/ui/filter-pills";
import { HoldButton } from "@/components/ui/hold-button";
import { StatusPill } from "@/components/ui/pill";
import { daysTone, formatEtDate } from "@/lib/data/format";
import type { ProxySubscription } from "@/lib/data/proxycheap";
import type { ProxyPhoneRow } from "@/lib/data/proxies";
import { parsePastedProxy } from "@/lib/data/proxy-paste";
import { cn } from "@/lib/utils";

export type AvailableProxy = ProxySubscription & { daysLeft: number };

/**
 * Point one phone at a different proxy.
 *
 * Two ways in, because neither covers the job alone.
 *
 * **Choose from list** shows the subscriptions proxy-cheap is billing for that
 * no phone is using, and sends only an id — the browser never sees a password.
 * It was labelled "Choose a spare" until Garreth pointed out that "spare" reads
 * as second-hand: someone who has just bought a proxy would not look for it
 * under that word.
 * What it cannot do is show proxy-cheap's own "Proxy 56" names: their API has
 * no name field, and the numbering cannot be reconstructed from purchase order
 * either, because expired proxies hold slots in the sequence and are invisible
 * to the API (proven 2026-09-12 — interpolating between two confirmed names
 * missed by six).
 *
 * **Paste** closes exactly that gap. `IP:PORT:USERNAME:PASSWORD` is the string
 * the SOP already has people copy out of proxy-cheap, so whoever is looking at
 * "Proxy 56" on that screen can copy its line straight across without having to
 * translate a name into an IP. It is also the only route for a proxy bought
 * anywhere other than proxy-cheap.
 *
 * Copy is deliberately thin — placeholder, readback, and nothing else. Garreth's
 * standing rule for new screens (2026-09-12) is to avoid stacking instructions
 * on them; the format lives in the placeholder, where it is needed, instead of
 * in a sentence above the field.
 *
 * Held, not clicked. A swap changes the account's public IP, which is exactly
 * the kind of change a platform notices, so this gets the same deliberation
 * gate as a retire. That hold is now the *only* gate — the banner spelling out
 * the IP consequence was removed on Garreth's call 2026-09-12, as something
 * every operator here already knows and read as clutter on every open.
 */
export function ReplaceProxyModal({
  row,
  available,
  onClose,
  onDone,
}: {
  row: ProxyPhoneRow;
  available: AvailableProxy[];
  onClose: () => void;
  onDone: (from: string | null, to: string) => void;
}) {
  const [mode, setMode] = useState<"choose" | "paste">("choose");
  const [picked, setPicked] = useState<number | null>(null);
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);
  // Which of the two writes failed, not just that something did. "check" means
  // nothing was touched; "attach" means the proxy is fine but the phone is not
  // on it — the outcome that looks like success and is not.
  const [failure, setFailure] = useState<{
    stage?: string;
    error: string;
    stillOn?: string | null;
  } | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // Escape closes, matching every other dismissible surface in the app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  const current = row.proxyHost ? `${row.proxyHost}:${row.proxyPort}` : null;
  // Soonest expiry first: if you are moving an account onto a new IP, the one
  // with the most runway left is almost always the right pick, and sorting the
  // other way would put the about-to-lapse ones under the cursor.
  const options = [...available].sort((a, b) => b.daysLeft - a.daysLeft);

  // The same parser the route uses, so the dialog can never accept a line the
  // server then rejects.
  const parsed = parsePastedProxy(raw);

  const ready = mode === "choose" ? picked !== null : parsed !== null;

  function submit() {
    if (!ready) return;
    setBusy(true);
    setFailure(null);
    fetch("/api/proxies/replace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        mode === "choose"
          ? { profile: row.profile, proxyCheapId: picked }
          : { profile: row.profile, raw: raw.trim() },
      ),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw Object.assign(new Error(data.error ?? "Request failed"), {
            stage: data.stage as string | undefined,
            stillOn: data.stillOn as string | null | undefined,
            fromServer: true,
          });
        }
        return data as { from: string | null; to: string };
      })
      .then((data) => {
        if (!alive.current) return;
        onDone(data.from, data.to);
      })
      .catch((err: unknown) => {
        if (!alive.current) return;
        const e = err as { message?: string; stage?: string; stillOn?: string | null };
        setFailure({
          stage: e.stage,
          error: e.message ?? "Network error",
          stillOn: e.stillOn,
        });
        setBusy(false);
      });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={() => !busy && onClose()}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-card border border-border glass-overlay p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="-mx-6 -mt-6 mb-5 flex items-start justify-between gap-3 border-b border-border p-6">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Globe className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold">Replace proxy — {row.profile}</h2>
              <p className="text-xs text-text-muted">
                {row.character ? `${row.character} · ` : ""}
                currently {current ?? "no proxy"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="text-text-muted hover:text-text-primary disabled:opacity-40"
          >
            <X className="size-5" />
          </button>
        </div>

        <FilterPills
          value={mode}
          onChange={setMode}
          className="mb-4"
          options={[
            { value: "choose", label: "Choose from list" },
            { value: "paste", label: "Paste credentials" },
          ]}
        />

        {mode === "paste" ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <input
              aria-label="Proxy credentials"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              disabled={busy}
              autoComplete="off"
              spellCheck={false}
              placeholder="IP:PORT:USERNAME:PASSWORD"
              className="w-full rounded-nested border border-border bg-card-raised px-3 py-2 font-mono text-xs outline-none placeholder:text-text-muted focus:border-accent disabled:opacity-40"
            />
            {/* Read back what was understood rather than only complaining when
                it is wrong: the failure this catches is a line that parses but
                is the wrong proxy, and only the host and port can show that.
                The password is never echoed. */}
            {raw.trim() !== "" &&
              (parsed ? (
                <p className="mt-2 font-mono text-xs text-text-muted">
                  <span className="text-text-primary">
                    {parsed.server}:{parsed.port}
                  </span>{" "}
                  · {parsed.username}
                </p>
              ) : (
                <p className="mt-2 text-xs text-warn">Expected IP:PORT:USERNAME:PASSWORD</p>
              ))}
          </div>
        ) : (
          <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
            {options.length === 0 ? (
              <p className="rounded-nested border border-border px-3 py-6 text-center text-sm text-text-muted">
                No unassigned proxies — use Paste credentials.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {options.map((p) => {
                  const on = picked === p.id;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setPicked(p.id)}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-nested border px-3 py-2.5 text-left transition-colors",
                          on
                            ? "border-accent bg-accent/10"
                            : "border-border hover:border-accent/50 disabled:hover:border-border",
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block font-mono text-xs">
                            {p.ip}:{p.port}
                          </span>
                          <span className="block truncate text-xs text-text-muted">
                            {p.isp ?? "unknown ISP"} · expires {formatEtDate(p.expiresAt)}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          {!p.autoExtend && <StatusPill tone="warn">no auto-renew</StatusPill>}
                          <StatusPill tone={daysTone(p.daysLeft)}>{p.daysLeft} d</StatusPill>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {failure && (
          <div className="mt-4 rounded-nested bg-danger/10 px-3 py-2 text-sm text-danger">
            <p>{failure.error}</p>
            {/* The second line is the part an operator acts on: whether the
                phone moved. "attach" is the dangerous case — the proxy passed
                its check, so the failure reads like success unless this says
                otherwise. */}
            <p className="mt-1 text-xs opacity-90">
              {failure.stage === "attach"
                ? failure.stillOn === undefined
                  ? `${row.profile} may not have been moved — check it in GeeLark.`
                  : `${row.profile} was not moved. Still on ${failure.stillOn ?? "no proxy"}.`
                : "Nothing was changed."}
            </p>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-nested border border-border px-4 py-2 text-sm text-text-muted hover:text-text-primary disabled:opacity-40"
          >
            Cancel
          </button>
          <HoldButton
            onConfirm={submit}
            disabled={busy || !ready}
            tone="warn"
            className="px-4 py-2 font-semibold"
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Replacing…
              </>
            ) : (
              "Replace proxy"
            )}
          </HoldButton>
        </div>
      </div>
    </div>
  );
}
