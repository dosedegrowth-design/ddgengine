/**
 * keyword-research — pesquisa de palavras-chave via Google Keyword Planner
 * (Google Ads API · GenerateKeywordIdeas). Fonte oficial e gratuita de
 * volume de busca + concorrência.
 *
 * Retorna, pra um termo semente: ideias relacionadas com volume médio
 * mensal, concorrência (baixa/média/alta) e tendência (3 meses), em
 * pt-BR / Brasil.
 *
 * Credenciais (env — mesmas do Tráfego DDG):
 *   GOOGLE_OAUTH_CLIENT_ID
 *   GOOGLE_OAUTH_CLIENT_SECRET
 *   GOOGLE_ADS_DEVELOPER_TOKEN
 *   GOOGLE_ADS_LOGIN_CUSTOMER_ID   (MCC, sem hífens)
 *   GOOGLE_ADS_REFRESH_TOKEN       (refresh token autorizado pro MCC)
 *   GOOGLE_ADS_CUSTOMER_ID         (conta consultada; default = MCC)
 *
 * Se faltar credencial, isConfigured()=false e a UI mostra estado neutro.
 */

const API_VERSION = "v23";
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

export function isConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
      process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
      process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
      process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID &&
      process.env.GOOGLE_ADS_REFRESH_TOKEN
  );
}

async function getAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
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
  if (!isConfigured()) {
    return {
      ok: false,
      notConfigured: true,
      error: "Pesquisa de palavra-chave ainda não configurada.",
    };
  }

  const customerId =
    process.env.GOOGLE_ADS_CUSTOMER_ID ?? process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID!;

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
    // Mensagens amigáveis pros erros comuns do Google Ads
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "Credencial Google Ads sem permissão pra esse recurso." };
    }
    return { ok: false, error: `Google Ads (${res.status}): ${body.slice(0, 200)}` };
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
