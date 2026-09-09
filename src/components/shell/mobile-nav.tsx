"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Menu } from "@/components/ui/icons";

/**
 * Open/closed state for the mobile nav drawer.
 *
 * Below `md:` the sidebar leaves the flex row and becomes an off-canvas drawer.
 * The control that opens it lives in the Topbar and the drawer itself is the
 * Sidebar — different branches of the layout tree — so the state is a context
 * rather than a prop drilled through a server component. Nothing outside the
 * shell reads it.
 *
 * Desktop is deliberately untouched: the only control that sets `open` is
 * `md:hidden`, and crossing into the desktop breakpoint clears it.
 */
interface MobileNav {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const MobileNavContext = createContext<MobileNav | null>(null);

/** The `md:` breakpoint the shell switches on. Keep in step with the classes. */
const DESKTOP_QUERY = "(min-width: 768px)";

export function useMobileNav(): MobileNav {
  const ctx = useContext(MobileNavContext);
  if (!ctx) throw new Error("useMobileNav must be used inside <MobileNavProvider>");
  return ctx;
}

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpenState] = useState(false);
  /** Whatever held focus when the drawer opened, so closing can hand it back. */
  const restoreRef = useRef<HTMLElement | null>(null);

  const setOpen = useCallback((next: boolean) => {
    if (next) restoreRef.current = document.activeElement as HTMLElement | null;
    setOpenState(next);
  }, []);

  /**
   * Escape closes, the page behind stops scrolling, and rotating a phone into
   * the desktop breakpoint drops the state — a drawer left "open" there would
   * hold the content column inert behind a scrim that no longer renders.
   */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenState(false);
    };
    const desktop = window.matchMedia(DESKTOP_QUERY);
    const onBreakpoint = () => {
      if (desktop.matches) setOpenState(false);
    };
    // Holds the page on pointer devices and stops the scrollbar. It is NOT
    // what holds iOS: Safari ignores this for touch. The phone is handled in
    // globals.css, by refusing the gesture on the panel and the scrim rather
    // than by pinning the body — `position: fixed` on the body would do it,
    // but it also drops the sticky topbar off-screen the moment you open the
    // drawer anywhere below the top of a page.
    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onBreakpoint);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
      document.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onBreakpoint);
    };
  }, [open]);

  /**
   * Hand focus back to whatever opened the drawer. Safe to do here: React
   * clears `inert` on the column during the commit, before effects run, so the
   * hamburger is focusable again by the time we ask for it.
   */
  useEffect(() => {
    if (open) return;
    const previous = restoreRef.current;
    restoreRef.current = null;
    previous?.focus();
  }, [open]);

  const value = useMemo(() => ({ open, setOpen }), [open, setOpen]);
  return <MobileNavContext.Provider value={value}>{children}</MobileNavContext.Provider>;
}

/**
 * The content column, held `inert` while the drawer is open so Tab cannot walk
 * into the page behind the scrim. The browser's own inertness is a better
 * answer than a hand-rolled focus trap: it covers the whole subtree, needs no
 * list of focusable selectors to go stale, and takes the column out of the
 * accessibility tree at the same time.
 */
export function ShellColumn({ children }: { children: React.ReactNode }) {
  const { open } = useMobileNav();
  return (
    <div inert={open} className="page-glow flex min-w-0 flex-1 flex-col">
      {children}
    </div>
  );
}

/**
 * The hamburger. Wears the Topbar's other round controls exactly — same size,
 * border, ground and hover — because it is one of them, not a new species of
 * button that happens to live next door.
 */
export function MobileNavTrigger() {
  const { open, setOpen } = useMobileNav();
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Open navigation"
      aria-expanded={open}
      aria-controls="pm-sidebar"
      className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-text-muted transition-colors hover:text-text-primary md:hidden"
    >
      <Menu className="size-4" />
    </button>
  );
}
