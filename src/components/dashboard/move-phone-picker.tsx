"use client";

import { Smartphone } from "@/components/ui/icons";
import { canTake, roomLabel, targetRefusal, type MoveTarget } from "@/lib/data/move-rules";
import { cn } from "@/lib/utils";

/**
 * Pick the phone an account is moving onto — design ticket P10.
 *
 * Every phone is listed, including the ones that cannot take the account, each
 * with the reason in place of its count. Hiding them would leave somebody
 * looking for a phone that is on the Devices page and not here, and the reason
 * they want — "it is full", "it is switched off" — is the thing they would
 * have gone to find out.
 */
export function MovePhonePicker({
  phones,
  value,
  onChange,
  name,
  disabled = false,
}: {
  phones: MoveTarget[];
  value: number | null;
  onChange: (id: number) => void;
  /** Radio group name; unique per dialog so two pickers never share a group. */
  name: string;
  disabled?: boolean;
}) {
  if (phones.length === 0) {
    return (
      <p className="rounded-nested border border-border bg-card-raised/40 px-3 py-4 text-center text-sm text-text-muted">
        No phones yet. Add one on the Devices page.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1.5" role="radiogroup" aria-label="Which phone">
      {phones.map((phone) => {
        const refusal = targetRefusal(phone);
        const usable = canTake(phone) && !disabled;
        const checked = value === phone.id;
        return (
          <li key={phone.id}>
            <label
              className={cn(
                "flex items-center gap-3 rounded-nested border px-3 py-2.5 transition-colors",
                usable ? "cursor-pointer border-border hover:bg-card-raised/60" : "border-border/60",
                checked && "border-accent/60 bg-accent/5",
                !usable && "opacity-55",
              )}
            >
              <input
                type="radio"
                name={name}
                value={phone.id}
                checked={checked}
                disabled={!usable}
                onChange={() => onChange(phone.id)}
                className="size-4 shrink-0 accent-accent"
              />
              <Smartphone className="size-4 shrink-0 text-text-muted" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{phone.name}</span>
                {phone.model && (
                  <span className="block truncate text-xs text-text-muted">{phone.model}</span>
                )}
              </span>
              {/* The count is the useful number on a phone that can take the
                  account; on one that cannot, the reason takes its place. */}
              <span
                className={cn(
                  "shrink-0 text-xs whitespace-nowrap",
                  refusal ? "text-warn" : "text-text-muted",
                )}
              >
                {refusal ?? roomLabel(phone)}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
