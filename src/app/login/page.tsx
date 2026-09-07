import Image from "next/image";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { isEmailAllowed } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

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

  redirect(error ? "/login?error=send-failed" : "/login?sent=1");
}

/** The sign-in form. Static: nothing here depends on the request, so it is what
 *  the page prerenders and what stands in while the query string resolves. */
function SignInForm({ error }: { error?: string }) {
  return (
    <form action={sendMagicLink} className="flex flex-col gap-3">
      <label className="text-sm text-text-muted" htmlFor="email">
        Sign in with your work email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        placeholder="you@example.com"
        className="rounded-nested border border-border bg-card-raised px-3 py-2.5 text-sm outline-none placeholder:text-text-muted focus:border-accent/60"
      />
      <button
        type="submit"
        className="rounded-nested bg-accent px-3 py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
      >
        Send magic link
      </button>
      {error === "not-allowed" && (
        <p className="text-sm text-danger">This email isn&apos;t on the allowlist.</p>
      )}
      {error === "send-failed" && (
        <p className="text-sm text-danger">Couldn&apos;t send the link. Try again.</p>
      )}
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
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-card border border-border bg-card p-8 shadow-card">
        <div className="mb-6 flex flex-col gap-2">
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
          <div className="text-xs text-text-muted">Pipeline dashboard</div>
        </div>

        <Suspense fallback={<SignInForm />}>
          <LoginState searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
