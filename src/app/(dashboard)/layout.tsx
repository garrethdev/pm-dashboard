import { MobileNavProvider, ShellColumn } from "@/components/shell/mobile-nav";
import { PageGlow } from "@/components/shell/page-glow";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { authBypassed } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
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
        <Sidebar />
        <ShellColumn>
          <PageGlow />
          <Topbar userEmail={email} />
          <main className="w-full flex-1 px-6 py-6">{children}</main>
        </ShellColumn>
      </div>
    </MobileNavProvider>
  );
}
