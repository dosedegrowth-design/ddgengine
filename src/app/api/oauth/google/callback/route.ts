/**
 * Callback OAuth Google — recebe code + state e salva tokens.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyApprovalToken } from "@/lib/whatsapp/notifications";
import { exchangeCodeForTokens } from "@/lib/integrations/oauth-google";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/settings/integrations?error=missing_code`);
  }

  const verified = verifyApprovalToken(state);
  if (!verified) {
    return NextResponse.redirect(`${baseUrl}/settings/integrations?error=invalid_state`);
  }

  const [siteId, provider] = verified.split(":");
  if (!siteId || !provider) {
    return NextResponse.redirect(`${baseUrl}/settings/integrations?error=invalid_state_format`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const supabase = await createClient();

    await supabase
      .from("site_integrations")
      .upsert({
        site_id: siteId,
        provider: provider as "google_search_console" | "google_analytics_4",
        access_token: tokens.access_token ?? null,
        refresh_token: tokens.refresh_token ?? null,
        expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        scope: tokens.scope ?? null,
        status: "active",
      }, { onConflict: "site_id,provider" });

    return NextResponse.redirect(`${baseUrl}/settings/integrations?connected=${provider}`);
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(`${baseUrl}/settings/integrations?error=token_exchange`);
  }
}
