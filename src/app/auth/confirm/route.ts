import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/** Magic-link landing: verifies the OTP token hash and starts the session. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Not "send-failed": the email arrived, the link in it did not verify. Almost
  // always an expired or already-used link, which asks for a different action
  // from the reader than a send failure does.
  return NextResponse.redirect(new URL("/login?error=bad-link", request.url));
}
