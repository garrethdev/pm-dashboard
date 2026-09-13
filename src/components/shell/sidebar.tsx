"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
  X,
} from "@/components/ui/icons";
import { SidebarToggleIcon } from "@/components/ui/sidebar-toggle-icon";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { useMobileNav } from "@/components/shell/mobile-nav";
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

/**
 * A nav row. The active state is deliberately NOT branded: it is a raised glass
 * pill with a filled icon badge, which is what lets the one accent-coloured
 * control on a page actually read as the action. Spending the accent on
 * navigation is what made every screen look uniformly blue.
 */
function NavItem({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
  standalone = false,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  collapsed: boolean;
  /** Draw its own active background. Rows inside the Pipeline list leave this
   *  to the sliding pill behind them; rows outside it (Settings) do not. */
  standalone?: boolean;
  /** Dismiss the mobile drawer. Wired to the rows rather than to a pathname
   *  effect because tapping the row you are already on has to close it too,
   *  and because the theme switch and the logout form share this container
   *  and must not. */
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href as never}
      onClick={onNavigate}
      data-active={active || undefined}
      title={collapsed ? label : undefined}
      className={cn(
        "relative flex items-center gap-2.5 rounded-nested text-sm transition-colors duration-200",
        collapsed ? "justify-center px-0 py-1.5" : "px-2 py-1.5",
        active
          ? cn("font-medium text-text-primary", standalone && "glass")
          : "text-text-muted hover:bg-card hover:text-text-primary",
      )}
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-200",
          active && "bg-text-primary text-bg",
        )}
      >
        <Icon className="size-4" />
      </span>
      {!collapsed && label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { open, setOpen } = useMobileNav();
  const [collapsedPref, setCollapsedPref] = useState(false);
  // Assumed true for the server render. Below `md:` the drawer is translated
  // off-screen whatever this says, so a phone never sees the guess; above it,
  // the guess is simply right.
  const [isDesktop, setIsDesktop] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Collapse is a desktop preference and nothing else. A drawer you opened on
  // purpose showing eight unlabelled icons is not a smaller sidebar, it is a
  // worse one — so the stored pref is read but not applied below `md:`.
  const collapsed = isDesktop && collapsedPref;

  /**
   * Glide the active pill between rows instead of repainting it in place.
   *
   * Measured from the DOM rather than computed from an index: row height comes
   * from padding and the icon badge, so a hardcoded stride would silently drift
   * the moment either changes. Written straight to the node — going through
   * state would re-render the whole sidebar for something only the pill needs,
   * and would trip react-hooks/set-state-in-effect for no benefit.
   */
  useEffect(() => {
    const list = listRef.current;
    const pill = pillRef.current;
    if (!list || !pill) return;
    const row = list.querySelector<HTMLElement>("[data-active]");
    if (!row) {
      pill.style.opacity = "0";
      return;
    }
    // No transition on the very first placement, or it slides in from the top.
    if (pill.style.opacity !== "1") pill.style.transition = "none";
    pill.style.opacity = "1";
    pill.style.height = `${row.offsetHeight}px`;
    pill.style.transform = `translateY(${row.offsetTop}px)`;
    if (pill.style.transition === "none") {
      void pill.offsetHeight;
      pill.style.transition = "";
    }
  }, [pathname, collapsed]);

  useEffect(() => {
    try {
      // localStorage does not exist on the server, so the collapsed
      // preference cannot be known until this is running in the browser.
      // Rendering expanded and correcting is the only order available.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsedPref(localStorage.getItem("pm-sidebar") === "collapsed");
    } catch {}
  }, []);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(desktop.matches);
    sync();
    desktop.addEventListener("change", sync);
    return () => desktop.removeEventListener("change", sync);
  }, []);

  // Focus moves into the drawer when it opens; the provider hands it back on
  // close. Without this, Tab from the hamburger lands nowhere — the column
  // behind is inert and the drawer was never entered.
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  const toggle = () => {
    setCollapsedPref((c) => {
      const next = !c;
      try {
        localStorage.setItem("pm-sidebar", next ? "collapsed" : "expanded");
      } catch {}
      return next;
    });
  };

  return (
    <>
      {/* Scrim. Below `md:` only — above it the rail is part of the page and
          there is nothing to dismiss. Kept mounted and faded rather than
          conditionally rendered so it has something to transition from. */}
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={cn(
          "nav-scrim fixed inset-0 z-40 md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        id="pm-sidebar"
        role={isDesktop ? undefined : "dialog"}
        aria-modal={isDesktop ? undefined : true}
        aria-label={isDesktop ? undefined : "Navigation"}
        // Closed on a phone it is off-screen but still in the tab order, which
        // is how an invisible menu ends up swallowing the first eight tabs of
        // a page. `inert` is the whole fix.
        inert={!isDesktop && !open}
        className={cn(
          // Phone: an off-canvas drawer, out of flow, over the scrim. `h-dvh`
          // rather than `h-screen` so mobile browser chrome does not push the
          // logout row under the address bar.
          "nav-drawer rail-glow fixed top-0 left-0 z-50 flex h-dvh w-60 shrink-0 flex-col border-r border-border bg-bg px-3 py-5",
          open ? "translate-x-0" : "-translate-x-full",
          // Desktop: exactly the layout that was here before — a sticky rail in
          // the flex row, no transform, width animating on collapse.
          "md:sticky md:z-auto md:h-screen md:translate-x-0 md:bg-transparent md:transition-[width]",
          collapsed ? "md:w-16 md:px-2" : "md:w-60 md:px-3",
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
        <Link href="/" onClick={() => setOpen(false)} className="flex items-center">
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
        {/* Close, below `md:` only. It takes the collapse toggle's slot rather
            than sitting beside it: the two are the same affordance at two
            breakpoints — get the rail out of the way — and only one of them is
            ever meaningful. */}
        <button
          ref={closeRef}
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
          className="-mr-[11px] flex size-8 shrink-0 items-center justify-center rounded-nested text-text-muted transition-colors hover:bg-card hover:text-text-primary md:hidden"
        >
          <X className="size-[18px]" />
        </button>
        <button
          type="button"
          onClick={toggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "hidden size-8 shrink-0 items-center justify-center rounded-nested text-text-muted transition-colors hover:bg-card hover:text-text-primary md:flex",
            // Optically aligned, not box-aligned. The 18px glyph sits centred in
            // a 32px hit target, so matching the row's padding would leave the
            // visible icon 11px short of the theme switch below it. The button
            // hangs into the gutter by exactly that much, putting its right edge
            // on the switch's.
            !collapsed && "-mr-[11px]",
          )}
        >
          <SidebarToggleIcon className="size-[18px]" />
        </button>
      </div>

      {/* The nav scrolls, not the drawer, so the close button stays put.
          `min-h-0` is what bounds it — a flex child defaults to its content
          height and would simply overflow `h-dvh` instead of scrolling.
          `overscroll-contain` stops the phone handing the gesture to the page
          underneath once the list hits its end. */}
      <nav className="nav-drawer-scroll no-scrollbar mt-3 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain md:overflow-visible">
        <GroupLabel collapsed={collapsed}>Pipeline</GroupLabel>
        <div ref={listRef} className="relative flex flex-col gap-0.5">
          <span
            ref={pillRef}
            aria-hidden
            className="glass pointer-events-none absolute inset-x-0 top-0 rounded-nested opacity-0 transition-[transform,height,opacity] duration-300 ease-out"
          />
          {PIPELINE_ITEMS.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              collapsed={collapsed}
              onNavigate={() => setOpen(false)}
              active={item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)}
            />
          ))}
        </div>

        <GroupLabel collapsed={collapsed}>Content</GroupLabel>
        {/* v2 — visible but disabled (plan §2.5) */}
        <div
          title={collapsed ? "Carousel Generator (v2)" : undefined}
          className={cn(
            "flex cursor-not-allowed items-center gap-2.5 rounded-nested py-1.5 text-sm text-text-muted opacity-50",
            collapsed ? "justify-center px-0" : "px-2",
          )}
          aria-disabled
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-[10px]">
            <Sparkle className="size-4" />
          </span>
          {!collapsed && (
            <>
              Carousel Generator
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
            standalone
            icon={Gear}
            collapsed={collapsed}
            onNavigate={() => setOpen(false)}
            active={pathname.startsWith("/settings")}
          />
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              title={collapsed ? "Logout" : undefined}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-nested py-1.5 text-sm text-text-muted transition-colors hover:bg-card hover:text-text-primary",
                collapsed ? "justify-center px-0" : "px-2",
              )}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-[10px]">
                <SignOut className="size-4" />
              </span>
              {!collapsed && "Logout"}
            </button>
          </form>
        </div>
      </nav>
      </aside>
    </>
  );
}
