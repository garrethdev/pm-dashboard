import { AppShell } from "@/components/shell/app-shell";

/*
 * The Carousel Generator's frame: the dashboard's shell with the generator's
 * own left menu in place of the dashboard's. A separate route group rather than
 * a layout nested inside (dashboard), because a nested layout can only add to
 * its parent — it cannot take the dashboard sidebar away.
 */
export default function CarouselGeneratorLayout({ children }: { children: React.ReactNode }) {
  return <AppShell nav="carousel">{children}</AppShell>;
}
