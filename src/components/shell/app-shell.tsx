import { MobileNavProvider, ShellColumn } from "@/components/shell/mobile-nav";
import { PageGlow } from "@/components/shell/page-glow";
import { Sidebar, type SidebarNav } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { authBypassed } from "@/lib/auth";
import { getFleet } from "@/lib/fleet-server";
import { createClient } from "@/lib/supabase/server";

/**
 * The frame every signed-in page sits in: the left menu, the top bar and the
 * content column.
 *
 * Shared by the dashboard and the Carousel Generator so the two stay one
 * product — same top bar, same bell, same sign-in — and differ only in which
 * menu the rail shows (Garreth, 2026-09-14). The sign-in gate itself is
 * `src/proxy.ts`, which covers both; this only reads who is signed in for the
 * top bar.
 */
export async function AppShell({ nav, children }: { nav: SidebarNav; children: React.ReactNode }) {
  let email: string | undefined;
  if (authBypassed()) {
    email = "dev@local";
  } else {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email;
  }

  // Which fleet this person is looking at (their own cookie). The generator has
  // no fleet, so its shell shows no switch.
  const fleet = nav === "dashboard" ? await getFleet() : undefined;

  return (
    <MobileNavProvider>
      <div className="flex min-h-screen">
        <Sidebar nav={nav} fleet={fleet} />
        <ShellColumn>
          <PageGlow />
          <Topbar userEmail={email} fleet={fleet} />
          {/* A flex column so an empty list can fill the space below it (design
              rule, Garreth 2026-09-19): anything that contains a full-size
              EmptyState grows to take the room that is left. See empty-state.tsx. */}
          <main className="flex w-full flex-1 flex-col px-6 py-6 [&_:has([data-empty-fill])]:grow">
            {children}
          </main>
        </ShellColumn>
      </div>
    </MobileNavProvider>
  );
}
