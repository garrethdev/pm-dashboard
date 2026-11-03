import { BookOpen } from "@/components/ui/icons";
import { RESOURCES } from "@/lib/resources";

/*
 * Resources (Garreth, 2026-11-03): links to the reference documents the
 * content pipeline is built on. Each is a live Claude Doc, edited there, so
 * this page never holds a copy that could go stale. The list is in
 * src/lib/resources.
 */

export default function ResourcesPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">Resources</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {RESOURCES.map((r) => (
          <a
            key={r.url}
            href={r.url}
            target="_blank"
            rel="noreferrer"
            className="flex gap-3 rounded-card border border-border bg-card p-4 shadow-card transition-colors hover:border-accent/60"
          >
            <BookOpen className="mt-0.5 size-5 shrink-0 text-text-muted" />
            <div>
              <div className="font-medium">{r.title}</div>
              <div className="mt-1 text-sm text-text-muted">{r.summary}</div>
              <div className="mt-2 text-xs text-accent">Open doc ↗</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
