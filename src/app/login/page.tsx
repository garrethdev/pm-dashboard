import Image from "next/image";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { MagicLinkSubmit } from "@/components/shell/magic-link-submit";
import { SideRays } from "@/components/ui/side-rays";
import { isEmailAllowed } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * The single gap between the card's three groups — logo, prompt+input, and
 * button+message. Declared once because it is set on two different containers
 * (the card, and the form nested inside it), and the whole point is that a
 * reader cannot tell where one ends and the other begins.
 */
const GROUP_GAP = "gap-9";

async function sendMagicLink(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim();

  if (!isEmailAllowed(email)) {
    redirect("/login?error=not-allowed");
  }

  const headerList = await headers();
  const origin = headerList.get("origin") ?? `https://${headerList.get("host")}`;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/confirm` },
  });

  if (!error) redirect("/login?sent=1");

  // Rate limiting is the failure people will actually meet, and it is the one
  // where "try again" is the wrong instruction — retrying is what keeps it
  // failing. Supabase answers 429 both for the per-address cooldown of about a
  // minute and for the hourly cap on its built-in sender; the message says wait
  // either way, because the fix is the same and the difference is not worth a
  // second string. Seen live 2026-09-07: two links sent, then 429s.
  redirect(error.status === 429 ? "/login?error=rate-limit" : "/login?error=send-failed");
}

/**
 * The sign-in form, in two of the card's three groups.
 *
 * Group 2 is the prompt and its input; group 3 is the button and whatever
 * message belongs under it. Both use the same GROUP_GAP as the card puts
 * between the logo and this form, so every gap between groups is identical and
 * only the spacing *within* a group is tighter. That is what stops the card
 * reading as "logo, then a long fall, then some controls".
 *
 * Static: nothing here depends on the request, so it is what the page
 * prerenders and what stands in while the query string resolves.
 */
function SignInForm({ error }: { error?: string }) {
  return (
    <form action={sendMagicLink} className={`flex flex-col ${GROUP_GAP}`}>
      {/* Group 2 — the ask and where you answer it */}
      <div className="flex flex-col gap-3">
        <label className="text-sm text-text-muted" htmlFor="email">
          Sign in with your work email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          className="rounded-nested border border-border bg-card-raised px-3.5 py-3 text-sm outline-none placeholder:text-text-muted focus:border-accent/60"
        />
      </div>

      {/* Group 3 — the action, and the consequence of the last one */}
      <div className="flex flex-col gap-3">
        <MagicLinkSubmit />
        {error === "not-allowed" && (
          <p className="text-sm text-danger">This email isn&apos;t on the allowlist.</p>
        )}
        {error === "rate-limit" && (
          <p className="text-sm text-warn">
            Too many sign-in emails have gone out. Wait a few minutes, then try again — a
            second attempt now will fail the same way.
          </p>
        )}
        {error === "send-failed" && (
          <p className="text-sm text-danger">Couldn&apos;t send the link. Try again.</p>
        )}
        {error === "bad-link" && (
          <p className="text-sm text-danger">
            That link didn&apos;t work. Magic links expire and can only be used once — send a
            fresh one.
          </p>
        )}
      </div>
    </form>
  );
}

/** The only part of this page that reads the request. */
async function LoginState({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const params = await searchParams;
  if (params.sent) {
    return (
      <p className="text-sm text-text-muted">
        Magic link sent. Check your inbox and open the link on this device.
      </p>
    );
  }
  return <SignInForm error={params.error} />;
}

/**
 * Awaiting searchParams at the top of the page made the whole route wait on the
 * request, which under Cache Components blocks the prerender. The card and its
 * logo are static and now render immediately; only the branch that reads the
 * query string suspends. Its fallback is the form itself — the state a visitor
 * arrives in almost every time — so the common path shows no placeholder and
 * does not shift when the params land.
 */
export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* Behind everything, and inert. Cyan rather than the component's default
          amber: the accent is the one colour this product spends, and a login
          screen is the one place it can fill the frame. */}
      <div className="absolute inset-0 z-0">
        <SideRays
          rayColor1="#22d3ee"
          rayColor2="#96c8ff"
          origin="top-right"
          speed={1.4}
          intensity={1.4}
          spread={1.8}
          saturation={1.2}
          blend={0.7}
          falloff={1.9}
          opacity={0.5}
        />
      </div>

      <div className={`relative z-10 flex w-full max-w-sm flex-col ${GROUP_GAP} rounded-card border border-border bg-card/90 px-9 py-14 shadow-card backdrop-blur-xl`}>
        <div className="flex flex-col gap-2">
          <Image
            src="/logo-white.svg"
            alt="Peptide Miracles"
            width={816}
            height={287}
            priority
            className="dark-only h-14 w-auto"
          />
          <Image
            src="/logo-black.svg"
            alt="Peptide Miracles"
            width={816}
            height={287}
            priority
            className="light-only h-14 w-auto"
          />
        </div>

        <Suspense fallback={<SignInForm />}>
          <LoginState searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
