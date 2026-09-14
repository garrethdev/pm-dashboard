import Link from "next/link";
import { ChevronRight, Images } from "@/components/ui/icons";

/*
 * Generate — the way into every generator.
 *
 * One card per kind of content the dashboard can make. Only Carousel exists
 * today; a new generator is one more entry here and nothing else changes
 * (Garreth, 2026-09-14).
 *
 * The cards sit in one row that scrolls sideways, the same shape as the
 * Content Types cards, so a fifth generator does not drop onto a row of its own.
 * No instruction text, per the copy rule: the card's name is the whole label.
 */

const GENERATORS = [{ label: "Carousel", href: "/carousel-generator", icon: Images }] as const;

export default function GeneratePage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Generate</h1>
      {/* Padding either side stops the focus ring being clipped by overflow-x. */}
      <div className="no-scrollbar -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1">
        {GENERATORS.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href as never}
            className="group flex w-[min(86vw,16rem)] shrink-0 snap-start flex-col gap-5 rounded-card border border-border bg-card p-5 shadow-card transition-colors duration-200 hover:border-text-muted/50"
          >
            <span className="flex aspect-[4/5] w-full items-center justify-center rounded-nested border border-border bg-bg text-text-muted transition-colors duration-200 group-hover:text-text-primary">
              <Icon className="size-8" />
            </span>
            <span className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">{label}</span>
              <ChevronRight className="size-4 text-text-muted transition-colors duration-200 group-hover:text-text-primary" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
