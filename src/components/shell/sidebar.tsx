"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  House,
  Users,
  Package,
  CalendarDots,
  Cards,
  Globe,
  FlowArrow,
  ChartBar,
  Sparkle,
  Gear,
  SignOut,
} from "@/components/ui/icons";
import { SidebarToggleIcon } from "@/components/ui/sidebar-toggle-icon";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { PeptideMark } from "@/components/ui/peptide-mark";
import { cn } from "@/lib/utils";

const PIPELINE_ITEMS = [
  { label: "Dashboard", href: "/", icon: House },
  { label: "Accounts", href: "/accounts", icon: Users },
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "Content calendar", href: "/content-calendar", icon: CalendarDots },
  { label: "Content types", href: "/content-types", icon: Cards },
  { label: "Proxies & phones", href: "/proxies", icon: Globe },
  { label: "Automation", href: "/automation", icon: FlowArrow },
  { label: "Analytics", href: "/analytics", icon: ChartBar },
] as const;

function GroupLabel({ children, collapsed }: { children: React.ReactNode; collapsed: boolean }) {
  if (collapsed) return <div className="pt-4" />;
  return (
    <div className="px-3 pt-6 pb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-text-muted">
      {children}
    </div>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href as never}
      title={collapsed ? label : undefined}
      className={cn(
        "flex items-center gap-3 rounded-nested py-2 text-sm transition-colors",
        collapsed ? "justify-center px-0" : "px-3",
        active
          ? "bg-accent-soft font-medium text-accent"
          : "text-text-muted hover:bg-card hover:text-text-primary",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("pm-sidebar") === "collapsed");
    } catch {}
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem("pm-sidebar", next ? "collapsed" : "expanded");
      } catch {}
      return next;
    });
  };

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col border-r border-border py-5 transition-[width]",
        collapsed ? "w-16 px-2" : "w-60 px-3",
      )}
    >
      {/* Brand row — logo left, collapse toggle right. Collapsed, the two stack
          so the toggle stays reachable without the wordmark's width. */}
      <div
        className={cn(
          "flex items-center",
          collapsed ? "flex-col gap-2" : "justify-between gap-2 px-3",
        )}
      >
        <Link href="/" className="flex items-center">
          {collapsed ? (
            <PeptideMark className="size-8 text-text-primary" />
          ) : (
            <>
              <Image
                src="/logo-white.svg"
                alt="Peptide Miracles"
                width={816}
                height={287}
                priority
                className="dark-only h-9 w-auto"
              />
              <Image
                src="/logo-black.svg"
                alt="Peptide Miracles"
                width={816}
                height={287}
                priority
                className="light-only h-9 w-auto"
              />
            </>
          )}
        </Link>
        <button
          type="button"
          onClick={toggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex size-8 shrink-0 items-center justify-center rounded-nested text-text-muted transition-colors hover:bg-card hover:text-text-primary"
        >
          <SidebarToggleIcon className="size-[18px]" />
        </button>
      </div>

      <nav className="mt-3 flex flex-1 flex-col">
        <GroupLabel collapsed={collapsed}>Pipeline</GroupLabel>
        <div className="flex flex-col gap-0.5">
          {PIPELINE_ITEMS.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              collapsed={collapsed}
              active={item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)}
            />
          ))}
        </div>

        <GroupLabel collapsed={collapsed}>Content</GroupLabel>
        {/* v2 — visible but disabled (plan §2.5) */}
        <div
          title={collapsed ? "Generate (v2)" : undefined}
          className={cn(
            "flex cursor-not-allowed items-center gap-3 rounded-nested py-2 text-sm text-text-muted opacity-50",
            collapsed ? "justify-center px-0" : "px-3",
          )}
          aria-disabled
        >
          <Sparkle className="size-4 shrink-0" />
          {!collapsed && (
            <>
              Generate
              <span className="ml-auto rounded-full bg-card-raised px-2 py-0.5 text-[10px] font-medium text-text-muted">
                v2
              </span>
            </>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-0.5 border-t border-border pt-3">
          {collapsed ? (
            <div className="flex justify-center">
              <ThemeToggle collapsed />
            </div>
          ) : (
            <ThemeToggle />
          )}

          <NavItem
            href="/settings"
            label="Settings"
            icon={Gear}
            collapsed={collapsed}
            active={pathname.startsWith("/settings")}
          />
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              title={collapsed ? "Logout" : undefined}
              className={cn(
                "flex w-full items-center gap-3 rounded-nested py-2 text-sm text-text-muted transition-colors hover:bg-card hover:text-text-primary",
                collapsed ? "justify-center px-0" : "px-3",
              )}
            >
              <SignOut className="size-4 shrink-0" />
              {!collapsed && "Logout"}
            </button>
          </form>
        </div>
      </nav>
    </aside>
  );
}
