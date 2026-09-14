import { MobileNavProvider, ShellColumn } from "@/components/shell/mobile-nav";
import { PageGlow } from "@/components/shell/page-glow";
import { Sidebar, type SidebarNav } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { authBypassed } from "@/lib/auth";
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

  return (
    <MobileNavProvider>
      <div className="flex min-h-screen">
        <Sidebar nav={nav} />
        <ShellColumn>
          <PageGlow />
          <Topbar userEmail={email} />
          <main className="w-full flex-1 px-6 py-6">{children}</main>
        </ShellColumn>
      </div>
    </MobileNavProvider>
  );
}
