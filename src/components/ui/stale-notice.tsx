import { CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Says out loud that what is on screen is a remembered copy.
 *
 * The whole reason live days bypass the cache is that a stale calendar is
 * indistinguishable from a current one — on 2026-09-06 an empty day from
 * before the 06:30 run read as "the scheduler never fired". A fallback that
 * did not announce itself would put that failure straight back, so this is not
 * decoration: it is the condition on which serving stale data is acceptable.
 */
export function StaleNotice({
  fetchedAt,
  className,
}: {
  fetchedAt: string;
  className?: string;
}) {
  const at = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(fetchedAt));

  return (
    <p
      role="status"
      className={cn(
        "flex items-start gap-2 rounded-nested bg-warn/10 px-3 py-2 text-xs text-warn",
        className,
      )}
    >
      <CloudOff className="mt-0.5 size-3.5 shrink-0" />
      <span>
        Supabase is not responding. Showing the last copy from{" "}
        <span className="font-medium tnum">{at} ET</span> — anything posted or
        scheduled since then is missing. Refresh to try again.
      </span>
    </p>
  );
}
