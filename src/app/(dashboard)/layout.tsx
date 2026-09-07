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
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="page-glow flex min-w-0 flex-1 flex-col">
        <PageGlow />
        <Topbar userEmail={email} />
        <main className="w-full flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
