/**
 * /api/google-ads/connect — inicia o OAuth do Google Ads (Keyword Planner).
 *
 * Só admin DDG. Manda o admin pro consentimento do Google. O callback grava
 * o refresh token no nosso banco. Fluxo 100% hospedado — nada local.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { hasAppCredentials } from "@/lib/seo/keyword-research";

export const runtime = "nodejs";

const SCOPE = "https://www.googleapis.com/auth/adwords";

export async function GET(req: NextRequest) {
  // Autoriza por sessão admin OU por chave de setup (?key=) — bootstrap
  // one-time, libera de qualquer sessão (ex: admin testando como cliente).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const key = new URL(req.url).searchParams.get("key");
  const setupKey = process.env.GOOGLE_ADS_SETUP_KEY;
  const authorized = isAdminEmail(user?.email) || (setupKey && key === setupKey);
  if (!authorized) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }
  if (!hasAppCredentials()) {
    return NextResponse.json(
      { error: "Faltam as credenciais de app (client id/secret, dev token, MCC) nas envs." },
      { status: 400 }
    );
  }

  const host = req.headers.get("host") ?? "conteudai.com.br";
  const redirectUri = `https://${host}/api/google-ads/callback`;
  const state = crypto.randomUUID();

  const authUrl =
    "https://accounts.google.com/o/oauth2/v2/auth?" +
    new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPE,
      access_type: "offline",
      prompt: "consent",
      state,
    });

  const res = NextResponse.redirect(authUrl);
  res.cookies.set("gads_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
