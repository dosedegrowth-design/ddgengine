/**
 * Wrapper da Vercel Domains API — adiciona/verifica/remove domínios custom
 * (subdomínios de blog dos clientes) no nosso projeto Vercel.
 *
 * Fluxo: cliente adiciona CNAME blog.dominio.com.br → cname.conteudai.com.br;
 * a gente chama addProjectDomain(blog.dominio.com.br); Vercel valida via CNAME
 * e emite SSL automático. O middleware (proxy.ts) então resolve o Host pro tenant.
 *
 * Env vars necessárias:
 *  - VERCEL_API_TOKEN   (token com acesso ao projeto)
 *  - VERCEL_PROJECT_ID  (prj_...)
 *  - VERCEL_TEAM_ID     (team_...)
 */

const API = "https://api.vercel.com";

function cfg() {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;
  if (!token || !projectId) {
    throw new Error(
      "Vercel domains: faltam VERCEL_API_TOKEN / VERCEL_PROJECT_ID nas env vars"
    );
  }
  return { token, projectId, teamId };
}

function teamQuery(teamId?: string): string {
  return teamId ? `?teamId=${teamId}` : "";
}

async function vfetch(
  path: string,
  init: RequestInit & { token: string }
): Promise<Response> {
  const { token, ...rest } = init;
  return fetch(`${API}${path}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(rest.headers ?? {}),
    },
  });
}

export interface AddDomainResult {
  ok: boolean;
  alreadyExists?: boolean;
  error?: string;
}

/**
 * Adiciona o domínio (ex: blog.cliente.com.br) ao projeto Vercel.
 * Idempotente: se já existe, retorna ok=true, alreadyExists=true.
 */
export async function addProjectDomain(host: string): Promise<AddDomainResult> {
  const { token, projectId, teamId } = cfg();
  const res = await vfetch(
    `/v10/projects/${projectId}/domains${teamQuery(teamId)}`,
    {
      method: "POST",
      token,
      body: JSON.stringify({ name: host }),
    }
  );

  if (res.ok) return { ok: true };

  const body = await res.json().catch(() => ({}));
  const code = body?.error?.code as string | undefined;
  // Domínio já está no projeto → tratamos como sucesso (idempotente)
  if (
    code === "domain_already_in_use" ||
    code === "domain_taken" ||
    res.status === 409
  ) {
    return { ok: true, alreadyExists: true };
  }
  return {
    ok: false,
    error: body?.error?.message ?? `Vercel addDomain HTTP ${res.status}`,
  };
}

export interface DomainStatus {
  /** Domínio existe no projeto */
  exists: boolean;
  /** Vercel já validou (CNAME apontado + SSL pronto) */
  verified: boolean;
  /** DNS ainda não bate (cliente não adicionou/propagou o CNAME) */
  misconfigured: boolean;
  /** Instruções de verificação pendentes, se houver */
  error?: string;
}

/**
 * Lê o status do domínio no projeto + config de DNS.
 * verified=true significa: CNAME apontado corretamente + SSL emitido.
 */
export async function getProjectDomainStatus(host: string): Promise<DomainStatus> {
  const { token, projectId, teamId } = cfg();

  // 1. Domínio existe no projeto + verified?
  const dRes = await vfetch(
    `/v9/projects/${projectId}/domains/${host}${teamQuery(teamId)}`,
    { method: "GET", token }
  );
  if (dRes.status === 404) {
    return { exists: false, verified: false, misconfigured: true };
  }
  if (!dRes.ok) {
    const body = await dRes.json().catch(() => ({}));
    return {
      exists: false,
      verified: false,
      misconfigured: true,
      error: body?.error?.message ?? `Vercel getDomain HTTP ${dRes.status}`,
    };
  }
  const domain = await dRes.json();
  const verifiedFlag = Boolean(domain?.verified);

  // 2. Config DNS (misconfigured = CNAME ainda não bate)
  const cRes = await vfetch(
    `/v6/domains/${host}/config${teamQuery(teamId)}`,
    { method: "GET", token }
  );
  let misconfigured = false;
  if (cRes.ok) {
    const conf = await cRes.json();
    misconfigured = Boolean(conf?.misconfigured);
  }

  return {
    exists: true,
    // Considera pronto quando o domínio está verified E o DNS não está misconfigured
    verified: verifiedFlag && !misconfigured,
    misconfigured,
  };
}

/**
 * Remove o domínio do projeto (cancelamento / troca de domínio).
 */
export async function removeProjectDomain(host: string): Promise<{ ok: boolean; error?: string }> {
  const { token, projectId, teamId } = cfg();
  const res = await vfetch(
    `/v9/projects/${projectId}/domains/${host}${teamQuery(teamId)}`,
    { method: "DELETE", token }
  );
  if (res.ok || res.status === 404) return { ok: true };
  const body = await res.json().catch(() => ({}));
  return {
    ok: false,
    error: body?.error?.message ?? `Vercel removeDomain HTTP ${res.status}`,
  };
}
