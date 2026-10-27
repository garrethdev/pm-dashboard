import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import {
  parseAccountsField,
  reportRefusal,
  screenshotRefusal,
  type IssueCategory,
  type ReportAccountInput,
  type ReportKind,
} from "@/lib/data/report-rules";
import { ReportRefusal, createReport } from "@/lib/data/reports";
import { actingUserEmail, auditLog } from "@/lib/data/writes";

/**
 * POST /api/reports — send an issue or an observation from the floating
 * button (Garreth, 2026-10-09; observations and accounts 2026-10-27).
 *
 * multipart/form-data with `kind`, `category`, `description`, `page` (the
 * path the reporter was on), `accounts` (JSON: `[{ profile, postId }]`, may be
 * empty) and an optional `screenshot`, already shrunk by the browser when it
 * was large. The reporter and the date come from the server, never from the
 * form.
 */
export async function POST(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid report" }, { status: 400 });
  }
  const kind = form.get("kind");
  const category = form.get("category");
  const description = form.get("description");
  const page = form.get("page");
  const pagePath = typeof page === "string" && page !== "" ? page : null;
  const accounts = parseAccountsField(form.get("accounts"));
  const refusal = reportRefusal({ kind, category, description, pagePath, accounts });
  if (refusal) return NextResponse.json({ error: refusal }, { status: 400 });

  const file = form.get("screenshot");
  const screenshot = file instanceof File && file.size > 0 ? file : null;
  if (screenshot) {
    const bad = screenshotRefusal(screenshot);
    if (bad) return NextResponse.json({ error: bad }, { status: 400 });
  }

  try {
    const userEmail = await actingUserEmail();
    const named = accounts as ReportAccountInput[];
    const saved = await createReport({
      reportedBy: userEmail,
      kind: kind as ReportKind,
      category: category as IssueCategory,
      description: description as string,
      pagePath,
      screenshot,
      accounts: named,
    });
    await auditLog({
      userEmail,
      action: "issue_report",
      target: `issue ${saved.id}`,
      newValue: { kind, category, page: pagePath, screenshot: saved.screenshotPath, accounts: named },
    });
    return NextResponse.json({ ok: true, id: saved.id });
  } catch (err) {
    if (err instanceof ReportRefusal) return NextResponse.json({ error: err.message }, { status: 400 });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "The report did not save" },
      { status: 502 },
    );
  }
}
