"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "@/components/ui/icons";

/**
 * Submit button for the sign-in form, with its own pending state.
 *
 * Sending a magic link goes out to Supabase's mail service and can take a
 * couple of seconds, during which the page looks identical to before the
 * click — so people click again, and a second request inside the per-address
 * cooldown is answered with a 429 that reads as a failure. The spinner is not
 * decoration here; it is what stops a self-inflicted rate limit.
 *
 * A separate client component because useFormStatus only reports on the form
 * it is rendered inside, not the one that renders it.
 */
export function MagicLinkSubmit() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center justify-center gap-2 rounded-nested bg-accent px-3 py-3 text-sm font-semibold text-bg transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-70"
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Sending…
        </>
      ) : (
        "Send magic link"
      )}
    </button>
  );
}
