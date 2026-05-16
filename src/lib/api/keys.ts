/**
 * API keys management.
 *
 * Formato: ddge_<env>_<random> (ex: ddge_live_abc123def456...)
 * Hash: SHA-256 do plain key.
 * Prefix mostrado pra identificação: primeiros 12 chars.
 */
import { randomBytes, createHash } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";

function hashKey(plain: string): string {
  return createHash("sha256").update(plain).digest("hex");
}

export interface GenerateKeyResult {
  id: string;
  plainKey: string; // mostrado apenas 1x ao criar
  prefix: string;
}

export async function generateApiKey(args: {
  organizationId: string;
  name: string;
  scopes?: string[];
  createdBy: string;
}): Promise<GenerateKeyResult> {
  const supabase = createServiceClient();
  const env = process.env.NODE_ENV === "production" ? "live" : "test";
  const secret = randomBytes(28).toString("base64url");
  const plainKey = `ddge_${env}_${secret}`;
  const prefix = plainKey.slice(0, 12);
  const hash = hashKey(plainKey);

  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      organization_id: args.organizationId,
      name: args.name,
      key_prefix: prefix,
      key_hash: hash,
      scopes: args.scopes ?? ["read"],
      created_by: args.createdBy,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return { id: data.id as string, plainKey, prefix };
}

export async function verifyApiKey(plainKey: string): Promise<{
  organizationId: string;
  keyId: string;
  scopes: string[];
  rateLimitPerMin: number;
} | null> {
  const supabase = createServiceClient();
  const hash = hashKey(plainKey);

  const { data: key } = await supabase
    .from("api_keys")
    .select("*")
    .eq("key_hash", hash)
    .is("revoked_at", null)
    .maybeSingle();

  if (!key) return null;
  if (key.expires_at && new Date(key.expires_at as string) < new Date()) return null;

  // Atualiza last_used_at fire-and-forget
  void supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", key.id);

  return {
    organizationId: key.organization_id as string,
    keyId: key.id as string,
    scopes: (key.scopes as string[]) ?? ["read"],
    rateLimitPerMin: (key.rate_limit_per_min as number) ?? 60,
  };
}

export async function revokeApiKey(keyId: string, orgId: string) {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("organization_id", orgId);
  return error ? { error: error.message } : { success: true };
}

/**
 * Helper pra autenticar requests da API pública.
 * Usado dentro de route handlers.
 */
export async function authenticateApiRequest(
  request: Request
): Promise<{ ok: true; orgId: string; keyId: string; scopes: string[] } | { ok: false; error: string; status: number }> {
  const auth = request.headers.get("authorization") ?? "";
  const match = auth.match(/^Bearer\s+(.+)$/);
  if (!match) return { ok: false, error: "Token ausente", status: 401 };

  const verified = await verifyApiKey(match[1]);
  if (!verified) return { ok: false, error: "Token inválido", status: 401 };

  return { ok: true, orgId: verified.organizationId, keyId: verified.keyId, scopes: verified.scopes };
}

/**
 * Log de request (fire-and-forget).
 */
export async function logApiRequest(args: {
  apiKeyId: string;
  organizationId: string;
  method: string;
  path: string;
  statusCode: number;
  responseTimeMs: number;
  ip?: string;
  userAgent?: string;
}) {
  const supabase = createServiceClient();
  await supabase.from("api_requests_log").insert({
    api_key_id: args.apiKeyId,
    organization_id: args.organizationId,
    method: args.method,
    path: args.path,
    status_code: args.statusCode,
    response_time_ms: args.responseTimeMs,
    ip: args.ip,
    user_agent: args.userAgent,
  });
}
