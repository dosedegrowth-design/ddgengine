/**
 * Inicia fluxo OAuth pra Google Analytics 4.
 */
import { NextResponse } from "next/server";
import { getCurrentSite } from "@/lib/auth";
import { buildAuthUrl } from "@/lib/integrations/oauth-google";
import { signApprovalToken } from "@/lib/whatsapp/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  const { site } = await getCurrentSite();
  if (!site) {
    return NextResponse.redirect(new URL("/onboarding", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }

  const state = signApprovalToken(`${site.id}:google_analytics_4`);
  const authUrl = buildAuthUrl({ scope: "analytics", state });
  return NextResponse.redirect(authUrl);
}
