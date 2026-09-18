import { InstagramIcon, TikTokIcon } from "@/components/ui/brand-icons";
import { FacebookLogo } from "@/components/ui/icons";
import { PLATFORM_LABEL, toPlatform } from "@/lib/platform";

/**
 * One account platform as a small mark. Takes the raw database value as well
 * as the typed one, so a screen never has to decide what an unknown platform
 * looks like. Colour comes from the caller's text colour, never a brand colour.
 */
export function PlatformIcon({
  platform,
  className = "size-3.5 shrink-0 text-text-muted",
}: {
  platform: string | null | undefined;
  className?: string;
}) {
  const p = toPlatform(platform);
  if (p === "instagram") return <InstagramIcon className={className} />;
  if (p === "facebook") {
    return (
      <span role="img" aria-label={PLATFORM_LABEL.facebook} className="inline-flex shrink-0">
        <FacebookLogo className={className} />
      </span>
    );
  }
  return <TikTokIcon className={className} />;
}
