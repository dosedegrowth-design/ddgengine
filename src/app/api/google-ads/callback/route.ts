/**
 * /api/google-ads/callback — recebe o code do Google, troca por refresh token
 * e GRAVA no nosso banco (ddg_engine.app_config). Fluxo hospedado, one-time.
 *
 * Só admin DDG. Renovar no futuro = acessar /api/google-ads/connect de novo.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { setRefreshToken } from "@/lib/seo/keyword-research";

export const runtime = "nodejs";

function back(req: NextRequest, params: Record<string, string>) {
  const url = new URL("/palavras-chave", `https://${req.headers.get("host")}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdminEmail(user?.email)) {
    return NextResponse.json({ error: "Só admin DDG." }, { status: 403 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const err = url.searchParams.get("error");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get("gads_oauth_state")?.value;

  if (err) return back(req, { gads_error: err });
  if (!code) return back(req, { gads_error: "sem_code" });
  if (!state || state !== cookieState) return back(req, { gads_error: "state_invalido" });

  const host = req.headers.get("host") ?? "conteudai.com.br";
  const redirectUri = `https://${host}/api/google-ads/callback`;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
        client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const json = await res.json();
    if (!json.refresh_token) {
      return back(req, {
        gads_error: json.error ?? "sem_refresh_token",
      });
    }
    await setRefreshToken(json.refresh_token as string);
    return back(req, { gads_connected: "1" });
  } catch (e) {
    return back(req, { gads_error: e instanceof Error ? e.message : "erro" });
  }
}
