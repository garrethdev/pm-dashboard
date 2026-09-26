import { analysisGroups, codeLabel } from "@/lib/carousel/trends/analysis";
import { plainText, type CarouselDetail } from "@/lib/carousel/trends/presentation";

/** Native disclosures support keyboard interaction and independently open groups. */
export function SavedAnalysis({ detail }: { detail: CarouselDetail }) {
  const groups = analysisGroups(detail.analysis);
  const status = plainText(detail.analysis?.inspection_status);
  const date = plainText(detail.analysis?.updated_at);
  const validDate = date && Number.isFinite(Date.parse(date)) ? new Date(date).toISOString().slice(0, 10) : null;
  return <>
    {detail.reading_required ? <p className="text-text-muted">No saved analysis yet.</p> : <p className="text-xs text-text-muted">{["complete", "partial", "blocked", "pending"].includes(status) ? codeLabel(status) : "Status unknown"}{status === "complete" || status === "partial" ? " · Read by the model" : ""}{validDate ? ` · ${validDate}` : ""}</p>}
    {status === "blocked" && <p>The slides could not be fetched.</p>}
    {groups.map(group => <details key={group.title} open={group.title === "Summary"} className="rounded-2xl border border-border bg-card-raised p-4">
      <summary className="cursor-pointer font-medium">{group.title}</summary>
      <dl className={`mt-4 gap-4 ${group.title === "Summary" ? "grid grid-cols-2" : "space-y-4"}`}>
        {group.rows.map(row => <div key={row.label} className="min-w-0"><dt className="text-xs text-text-muted">{row.label}</dt><dd className="mt-1 whitespace-pre-wrap break-words">{row.values.length === 1 ? row.values[0] : <ul className="list-disc space-y-1 pl-4">{row.values.map((value, index) => <li key={index}>{value}</li>)}</ul>}</dd></div>)}
      </dl>
    </details>)}
    {!groups.length && detail.documents.length > 0 && <details className="rounded-2xl border border-border p-4"><summary className="cursor-pointer font-medium">Saved evidence</summary>{detail.documents.map((document, index) => <p key={String(document.id ?? index)} className="mt-3 whitespace-pre-wrap break-words">{plainText(document.content)}</p>)}</details>}
    <p className="text-xs text-text-muted">Saved model observations are not proof of causation.</p>
  </>;
}
