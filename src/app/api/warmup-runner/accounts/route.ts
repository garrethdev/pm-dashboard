import { NextResponse } from "next/server";
import { eligibleAccounts } from "@/lib/data/warmup-runs";
import { requireRunnerToken, runnerFailure } from "@/lib/warmup-runner-api";

/**
 * GET /api/warmup-runner/accounts — the warmup script's operation 1 (PF-13).
 *
 * Every account the script may warm: in use, on a phone on the Physical fleet,
 * set to Automated, and not banned. The script reads it to plan the day and
 * again just before each session, in case an account was flipped back to
 * Manual. Ids are text.
 */
export async function GET(request: Request) {
  const denied = requireRunnerToken(request);
  if (denied) return denied;
  try {
    return NextResponse.json({ accounts: await eligibleAccounts() });
  } catch (err) {
    return runnerFailure(err);
  }
}
