/**
 * Inicia fluxo OAuth pra Google Search Console.
 */
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { getCurrentSite } from "@/lib/auth";
import { buildAuthUrl } from "@/lib/integrations/oauth-google";
import { signApprovalToken } from "@/lib/whatsapp/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  const { site } = await getCurrentSite();
  if (!site) {
    return NextResponse.redirect(new URL("/onboarding", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }

  // Usa token assinado como state (HMAC) pra evitar CSRF
  const state = signApprovalToken(`${site.id}:google_search_console`);
  const authUrl = buildAuthUrl({ scope: "search_console", state });
  return NextResponse.redirect(authUrl);
}
