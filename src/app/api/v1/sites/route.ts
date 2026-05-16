/**
 * GET /api/v1/sites — lista sites da org autenticada
 * POST /api/v1/sites — cria novo site (futuro)
 *
 * Auth: Bearer ddge_*
 */
import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest, logApiRequest } from "@/lib/api/keys";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const start = Date.now();
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = createServiceClient();
  const { data: sites, error } = await supabase
    .from("sites")
    .select("id, domain, status, stack_detected, audit_score, has_cloudflare, proxy_method, proxy_path, vertical, created_at")
    .eq("organization_id", auth.orgId)
    .order("created_at", { ascending: false });

  const response = error
    ? NextResponse.json({ error: error.message }, { status: 500 })
    : NextResponse.json({ data: sites });

  void logApiRequest({
    apiKeyId: auth.keyId,
    organizationId: auth.orgId,
    method: "GET",
    path: "/api/v1/sites",
    statusCode: response.status,
    responseTimeMs: Date.now() - start,
    ip: request.headers.get("x-forwarded-for") ?? undefined,
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  return response;
}
