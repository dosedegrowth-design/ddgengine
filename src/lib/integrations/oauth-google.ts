/**
 * OAuth Google pra GSC + GA4.
 * Setup:
 * 1. Console GCP > APIs & Services > OAuth consent screen
 * 2. Credentials > OAuth client ID (Web)
 * 3. Authorized redirect URI: {APP_URL}/api/oauth/google/callback
 * 4. Adicionar GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET nas envs
 */
import { google } from "googleapis";

export const GOOGLE_SCOPES = {
  search_console: ["https://www.googleapis.com/auth/webmasters.readonly"],
  analytics: ["https://www.googleapis.com/auth/analytics.readonly"],
  both: [
    "https://www.googleapis.com/auth/webmasters.readonly",
    "https://www.googleapis.com/auth/analytics.readonly",
  ],
};

function oauthClient() {
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !secret) throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET não configurados");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return new google.auth.OAuth2(id, secret, `${appUrl}/api/oauth/google/callback`);
}

export function buildAuthUrl(args: {
  scope: keyof typeof GOOGLE_SCOPES;
  state: string; // signed token contendo site_id + provider
}): string {
  const client = oauthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES[args.scope],
    state: args.state,
  });
}

export async function exchangeCodeForTokens(code: string) {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
}

/**
 * Lista propriedades GSC do user autenticado.
 */
export async function listGSCSites(accessToken: string, refreshToken: string) {
  const client = oauthClient();
  client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  const sc = google.searchconsole({ version: "v1", auth: client });
  const res = await sc.sites.list();
  return res.data.siteEntry ?? [];
}

/**
 * Lista propriedades GA4 do user autenticado.
 */
export async function listGA4Properties(accessToken: string, refreshToken: string) {
  const client = oauthClient();
  client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  const admin = google.analyticsadmin({ version: "v1beta", auth: client });
  const res = await admin.accountSummaries.list({});
  const properties: Array<{ propertyId: string; displayName: string; account: string }> = [];
  for (const acc of res.data.accountSummaries ?? []) {
    for (const prop of acc.propertySummaries ?? []) {
      properties.push({
        propertyId: prop.property?.replace("properties/", "") ?? "",
        displayName: prop.displayName ?? "",
        account: acc.displayName ?? "",
      });
    }
  }
  return properties;
}
