import Link from "next/link";
import { ArrowLeft } from "@/components/ui/icons";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ReapplyTheme } from "@/components/shell/reapply-theme";

/**
 * What an address that leads nowhere shows, inside the app's own frame
 * (P13 review, 2026-09-23).
 *
 * Without it a deleted phone, a wrong account number or a mistyped address
 * fell through to Next's built-in 404, which ignores the app's theme: in light
 * mode it painted the page black and took the logo and breadcrumb with it.
 *
 * The shared empty state, so it fills the page like any empty list, with one
 * line and the way back. No explanation: the line says what happened and the
 * link is the only thing to do about it.
 */
export function NotFoundState({
  icon,
  children,
  href,
  linkLabel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <ReapplyTheme />
      <Card className="flex flex-col">
        <EmptyState icon={icon}>
          <span className="flex flex-col items-center gap-1">
            <span>{children}</span>
            {/* 44px tall so a thumb finds it on a phone. */}
            <Link
              href={href}
              className="inline-flex min-h-11 items-center gap-1.5 px-3 font-medium text-text-primary hover:underline"
            >
              <ArrowLeft className="size-3.5" /> {linkLabel}
            </Link>
          </span>
        </EmptyState>
      </Card>
    </div>
  );
}
