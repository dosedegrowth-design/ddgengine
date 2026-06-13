/**
 * keyword-research — pesquisa de palavras-chave via Google Keyword Planner
 * (Google Ads API · GenerateKeywordIdeas). Fonte oficial e gratuita de
 * volume de busca + concorrência.
 *
 * Retorna, pra um termo semente: ideias relacionadas com volume médio
 * mensal, concorrência (baixa/média/alta) e tendência (3 meses), em
 * pt-BR / Brasil.
 *
 * Credenciais de app (env — ativos Google da DDG, estáveis):
 *   GOOGLE_OAUTH_CLIENT_ID
 *   GOOGLE_OAUTH_CLIENT_SECRET
 *   GOOGLE_ADS_DEVELOPER_TOKEN
 *   GOOGLE_ADS_LOGIN_CUSTOMER_ID   (MCC, sem hífens)
 *   GOOGLE_ADS_CUSTOMER_ID         (conta consultada; default = MCC)
 *
 * O REFRESH TOKEN é mintado pelo fluxo hospedado /api/google-ads/connect e
 * guardado no NOSSO banco (ddg_engine.app_config['google_ads_refresh_token']).
 * Fallback: env GOOGLE_ADS_REFRESH_TOKEN. Renovar = clicar "Conectar Google"
 * no admin (re-minta sozinho). Sem script local, sem env manual.
 */
import { createServiceClient } from "@/lib/supabase/server";

const API_VERSION = "v23";
const REFRESH_TOKEN_KEY = "google_ads_refresh_token";
const GEO_BRAZIL = "geoTargetConstants/2076";
const LANG_PT = "languageConstants/1014"; // Portuguese

export type Competition = "baixa" | "media" | "alta" | "desconhecida";

export interface KeywordIdea {
  keyword: string;
  /** Volume médio de buscas mensais (Brasil). */
  volume: number;
  competition: Competition;
  /** Índice de concorrência de anúncios 0-100 (proxy de dificuldade). */
  competitionIndex: number | null;
  /** Tendência: variação % do volume nos últimos 3 meses vs início da série. */
  trend: number | null;
}

/** As 4 credenciais de app (env) existem? (independe do token) */
export function hasAppCredentials(): boolean {
  return Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
      process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
      process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
      process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID
  );
}

/** Lê o refresh token: banco (preferido) → env (fallback). */
export async function getRefreshToken(): Promise<string | null> {
  try {
    const sb = createServiceClient();
    const { data } = await sb
      .from("app_config")
      .select("value")
      .eq("key", REFRESH_TOKEN_KEY)
      .maybeSingle();
    if (data?.value) return data.value;
  } catch {
    /* sem banco — cai no env */
  }
  return process.env.GOOGLE_ADS_REFRESH_TOKEN ?? null;
}

/** Lê uma config genérica do banco (app_config). */
async function getConfigValue(key: string): Promise<string | null> {
  try {
    const sb = createServiceClient();
    const { data } = await sb.from("app_config").select("value").eq("key", key).maybeSingle();
    return data?.value ?? null;
  } catch {
    return null;
  }
}

/** Conta consultada no Keyword Planner: banco → env → MCC. */
async function getCustomerId(): Promise<string> {
  return (
    (await getConfigValue("google_ads_customer_id")) ??
    process.env.GOOGLE_ADS_CUSTOMER_ID ??
    process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID!
  );
}

/** Grava o refresh token no banco (chamado pelo callback OAuth hospedado). */
export async function setRefreshToken(token: string): Promise<void> {
  const sb = createServiceClient();
  const { error } = await sb
    .from("app_config")
    .upsert({ key: REFRESH_TOKEN_KEY, value: token, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

/** Configurado = tem creds de app + um refresh token (banco ou env). */
export async function isConfigured(): Promise<boolean> {
  if (!hasAppCredentials()) return false;
  return Boolean(await getRefreshToken());
}

async function getAccessToken(): Promise<string> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) throw new Error("Sem refresh token — conecte o Google no admin.");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`OAuth Google falhou (${res.status})`);
  const json = await res.json();
  return json.access_token as string;
}

function mapCompetition(c: string | undefined): Competition {
  switch (c) {
    case "LOW":
      return "baixa";
    case "MEDIUM":
      return "media";
    case "HIGH":
      return "alta";
    default:
      return "desconhecida";
  }
}

interface RawMetrics {
  avgMonthlySearches?: string;
  competition?: string;
  competitionIndex?: string;
  monthlySearchVolumes?: Array<{ monthlySearches?: string }>;
}

function computeTrend(metrics: RawMetrics): number | null {
  const vols = metrics.monthlySearchVolumes;
  if (!vols || vols.length < 4) return null;
  const nums = vols.map((v) => Number(v.monthlySearches ?? 0));
  const recent = nums.slice(-3).reduce((a, b) => a + b, 0) / 3;
  const old = nums.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
  if (old === 0) return null;
  return Math.round(((recent - old) / old) * 100);
}

/** Lista as contas Google Ads que o token autorizado consegue acessar. */
export async function listAccessibleCustomers(): Promise<
  { ok: true; customers: string[] } | { ok: false; error: string }
> {
  if (!hasAppCredentials()) return { ok: false, error: "sem credenciais de app" };
  let accessToken: string;
  try {
    accessToken = await getAccessToken();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "auth" };
  }
  const res = await fetch(
    `https://googleads.googleapis.com/${API_VERSION}/customers:listAccessibleCustomers`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
      },
      signal: AbortSignal.timeout(12000),
    }
  );
  if (!res.ok) return { ok: false, error: `${res.status}: ${(await res.text()).slice(0, 300)}` };
  const j = await res.json();
  const customers = (j.resourceNames ?? []).map((r: string) => r.replace("customers/", ""));
  return { ok: true, customers };
}

export type KeywordResearchResult =
  | { ok: true; ideas: KeywordIdea[] }
  | { ok: false; error: string; notConfigured?: boolean };

/**
 * Gera ideias de palavra-chave a partir de 1+ termos semente.
 * Ordena por volume desc. Limita a `limit` resultados.
 */
export async function generateKeywordIdeas(
  seeds: string[],
  limit = 40
): Promise<KeywordResearchResult> {
  const cleanSeeds = seeds.map((s) => s.trim()).filter(Boolean).slice(0, 10);
  if (cleanSeeds.length === 0) return { ok: false, error: "Informe um termo." };
  if (!(await isConfigured())) {
    return {
      ok: false,
      notConfigured: true,
      error: "Pesquisa de palavra-chave ainda não configurada.",
    };
  }

  const customerId = await getCustomerId();

  let accessToken: string;
  try {
    accessToken = await getAccessToken();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro de autenticação." };
  }

  const url = `https://googleads.googleapis.com/${API_VERSION}/customers/${customerId}:generateKeywordIdeas`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
        "login-customer-id": process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        language: LANG_PT,
        geoTargetConstants: [GEO_BRAZIL],
        keywordPlanNetwork: "GOOGLE_SEARCH",
        keywordSeed: { keywords: cleanSeeds },
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro de rede." };
  }

  if (!res.ok) {
    const body = await res.text();
    // Extrai o motivo específico do Google Ads (errorCode + message)
    let detail = body.slice(0, 300);
    try {
      const j = JSON.parse(body);
      const gErr = j?.error?.details?.[0]?.errors?.[0];
      const code = gErr?.errorCode ? Object.values(gErr.errorCode)[0] : j?.error?.status;
      const msg = gErr?.message ?? j?.error?.message;
      if (code || msg) detail = `${code ?? ""} ${msg ?? ""}`.trim();
    } catch {
      /* mantém o body cru */
    }
    return { ok: false, error: `Google Ads ${res.status}: ${detail}` };
  }

  const json = await res.json();
  const results: Array<{ text?: string; keywordIdeaMetrics?: RawMetrics }> = json.results ?? [];

  const ideas: KeywordIdea[] = results
    .map((r) => {
      const m = r.keywordIdeaMetrics ?? {};
      return {
        keyword: r.text ?? "",
        volume: Number(m.avgMonthlySearches ?? 0),
        competition: mapCompetition(m.competition),
        competitionIndex: m.competitionIndex != null ? Number(m.competitionIndex) : null,
        trend: computeTrend(m),
      };
    })
    .filter((k) => k.keyword)
    .sort((a, b) => b.volume - a.volume)
    .slice(0, limit);

  return { ok: true, ideas };
}
