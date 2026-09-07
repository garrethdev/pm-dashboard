import { ArrowUpRight } from "@/components/ui/icons";

/**
 * Hand-off to a provider's own panel to extend a proxy or a phone rental.
 *
 * One component for both surfaces — the homepage Proxies & phones card and the
 * full table on /proxies — so the control cannot come to look or mean two
 * different things depending on where it was clicked. Destinations come from
 * `proxyExtendHref` / `phoneExtendHref`; a null href means the row has nothing
 * to extend and the caller renders nothing.
 *
 * Not a CtaButton: each of those owns a WebGL context, and this repeats per row.
 */
export function ExtendButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title="Open the provider's panel to extend this"
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-card-raised px-3 py-1 text-xs font-medium text-text-muted transition-colors hover:border-accent hover:text-accent"
    >
      Extend
      <ArrowUpRight className="size-3" />
    </a>
  );
}
