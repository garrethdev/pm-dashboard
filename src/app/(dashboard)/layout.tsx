import { AppShell } from "@/components/shell/app-shell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AppShell nav="dashboard">{children}</AppShell>;
}
