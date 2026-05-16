/**
 * Cloudflare API client.
 *
 * Usa API Token do Cloudflare com permissões:
 * - Workers Scripts: Edit
 * - Workers Routes: Edit
 * - Zone: Read
 *
 * Token gerado em https://dash.cloudflare.com/profile/api-tokens
 */
const CF_BASE = "https://api.cloudflare.com/client/v4";

interface CFResponse<T> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: Array<{ code: number; message: string }>;
  result: T;
}

function getCredentials() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!token) throw new Error("CLOUDFLARE_API_TOKEN não configurada");
  if (!accountId) throw new Error("CLOUDFLARE_ACCOUNT_ID não configurada");
  return { token, accountId };
}

type CFFetchInit = Omit<RequestInit, "body"> & { body?: unknown };

async function cfFetch<T>(path: string, init?: CFFetchInit): Promise<T> {
  const { token } = getCredentials();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...((init?.headers as Record<string, string>) ?? {}),
  };
  const rawBody = init?.body;
  const isJsonBody =
    rawBody &&
    typeof rawBody === "object" &&
    !(rawBody instanceof FormData) &&
    !(rawBody instanceof URLSearchParams) &&
    typeof rawBody !== "string";
  if (isJsonBody) {
    headers["Content-Type"] = "application/json";
  }

  const body = isJsonBody ? JSON.stringify(rawBody) : (rawBody as BodyInit | undefined);

  const res = await fetch(`${CF_BASE}${path}`, {
    ...init,
    headers,
    body: body as BodyInit | undefined,
  });

  const json = (await res.json()) as CFResponse<T>;
  if (!json.success) {
    const err = json.errors?.[0];
    throw new Error(`Cloudflare API error ${err?.code}: ${err?.message ?? res.statusText}`);
  }
  return json.result;
}

/**
 * Lista zones (domínios) acessíveis pelo token.
 */
export async function listZones(): Promise<Array<{ id: string; name: string; status: string }>> {
  return cfFetch("/zones?per_page=50");
}

/**
 * Busca zone pelo domínio.
 */
export async function findZoneByDomain(domain: string) {
  const clean = domain.replace(/^www\./, "");
  const zones = await cfFetch<Array<{ id: string; name: string; status: string }>>(
    `/zones?name=${encodeURIComponent(clean)}`
  );
  return zones[0] ?? null;
}

/**
 * Upload de Worker Script (apenas JavaScript ES modules).
 */
export async function uploadWorkerScript(name: string, script: string): Promise<{ id: string }> {
  const { accountId } = getCredentials();

  // Cloudflare exige multipart/form-data com metadata + script
  const metadata = {
    main_module: "worker.js",
    compatibility_date: "2025-04-01",
    compatibility_flags: [],
  };

  const formData = new FormData();
  formData.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" }),
    "metadata.json"
  );
  formData.append(
    "worker.js",
    new Blob([script], { type: "application/javascript+module" }),
    "worker.js"
  );

  return cfFetch(`/accounts/${accountId}/workers/scripts/${name}`, {
    method: "PUT",
    body: formData as unknown as BodyInit,
  });
}

/**
 * Cria/atualiza rota no Worker.
 */
export async function upsertWorkerRoute(args: {
  zoneId: string;
  pattern: string; // ex: meusite.com.br/blog/*
  scriptName: string;
}): Promise<{ id: string; pattern: string }> {
  // Lista rotas existentes
  const existing = await cfFetch<Array<{ id: string; pattern: string; script: string }>>(
    `/zones/${args.zoneId}/workers/routes`
  );
  const found = existing.find((r) => r.pattern === args.pattern);

  if (found) {
    // Atualiza
    return cfFetch(`/zones/${args.zoneId}/workers/routes/${found.id}`, {
      method: "PUT",
      body: { pattern: args.pattern, script: args.scriptName },
    });
  }

  // Cria
  return cfFetch(`/zones/${args.zoneId}/workers/routes`, {
    method: "POST",
    body: { pattern: args.pattern, script: args.scriptName },
  });
}

/**
 * Remove Worker e suas rotas.
 */
export async function deleteWorker(name: string): Promise<void> {
  const { accountId } = getCredentials();
  await cfFetch(`/accounts/${accountId}/workers/scripts/${name}`, {
    method: "DELETE",
  });
}

export async function deleteWorkerRoute(zoneId: string, routeId: string): Promise<void> {
  await cfFetch(`/zones/${zoneId}/workers/routes/${routeId}`, {
    method: "DELETE",
  });
}

/**
 * Testa a saúde do Worker fazendo um HEAD request na rota.
 */
export async function healthCheckRoute(domain: string, path: string): Promise<{ ok: boolean; status: number; ms: number }> {
  const url = `https://${domain}${path}`;
  const start = Date.now();
  try {
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(8000) });
    return { ok: res.ok || res.status === 404, status: res.status, ms: Date.now() - start };
  } catch {
    return { ok: false, status: 0, ms: Date.now() - start };
  }
}
