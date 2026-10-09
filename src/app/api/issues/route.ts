import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { reportRefusal, screenshotRefusal, type IssueCategory } from "@/lib/data/issue-rules";
import { createIssue } from "@/lib/data/issues";
import { actingUserEmail, auditLog } from "@/lib/data/writes";

/**
 * POST /api/issues — report an issue from the floating button (Garreth,
 * 2026-10-09).
 *
 * multipart/form-data with `category`, `description`, `page` (the path the
 * reporter was on) and an optional `screenshot`, already shrunk by the
 * browser when it was large. The reporter and the date come from the server,
 * never from the form.
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
  const category = form.get("category");
  const description = form.get("description");
  const page = form.get("page");
  const pagePath = typeof page === "string" && page !== "" ? page : null;
  const refusal = reportRefusal({ category, description, pagePath });
  if (refusal) return NextResponse.json({ error: refusal }, { status: 400 });

  const file = form.get("screenshot");
  const screenshot = file instanceof File && file.size > 0 ? file : null;
  if (screenshot) {
    const bad = screenshotRefusal(screenshot);
    if (bad) return NextResponse.json({ error: bad }, { status: 400 });
  }

  try {
    const userEmail = await actingUserEmail();
    const saved = await createIssue({
      reportedBy: userEmail,
      category: category as IssueCategory,
      description: description as string,
      pagePath,
      screenshot,
    });
    await auditLog({
      userEmail,
      action: "issue_report",
      target: `issue ${saved.id}`,
      newValue: { category, page: pagePath, screenshot: saved.screenshotPath },
    });
    return NextResponse.json({ ok: true, id: saved.id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "The issue did not save" },
      { status: 502 },
    );
  }
}
