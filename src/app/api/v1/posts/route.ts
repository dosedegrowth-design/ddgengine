/**
 * GET /api/v1/posts?site_id=X&status=Y&limit=N
 * POST /api/v1/posts — dispara geração (futuro)
 */
import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest, logApiRequest } from "@/lib/api/keys";
import { createServiceClient } from "@/lib/supabase/server";
import { emit } from "@/lib/inngest/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const start = Date.now();
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("site_id");
  const status = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);

  const supabase = createServiceClient();

  // Lista sites da org pra validar siteId
  const { data: orgSites } = await supabase
    .from("sites")
    .select("id")
    .eq("organization_id", auth.orgId);
  const orgSiteIds = (orgSites ?? []).map((s: any) => s.id);

  if (siteId && !orgSiteIds.includes(siteId)) {
    return NextResponse.json({ error: "Site não pertence à sua org" }, { status: 403 });
  }

  let query = supabase
    .from("posts")
    .select("id, site_id, slug, title, meta_description, type, status, published_at, created_at, cost_usd")
    .in("site_id", siteId ? [siteId] : orgSiteIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  const response = error
    ? NextResponse.json({ error: error.message }, { status: 500 })
    : NextResponse.json({ data });

  void logApiRequest({
    apiKeyId: auth.keyId,
    organizationId: auth.orgId,
    method: "GET",
    path: "/api/v1/posts",
    statusCode: response.status,
    responseTimeMs: Date.now() - start,
  });

  return response;
}

export async function POST(request: NextRequest) {
  const start = Date.now();
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.scopes.includes("write") && !auth.scopes.includes("admin")) {
    return NextResponse.json({ error: "Scope insuficiente (precisa write)" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const siteId = body.site_id as string | undefined;
  const type = body.type as "long_form" | "faq_page" | undefined;
  if (!siteId || !type) {
    return NextResponse.json({ error: "site_id e type são obrigatórios" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: site } = await supabase
    .from("sites")
    .select("id")
    .eq("id", siteId)
    .eq("organization_id", auth.orgId)
    .maybeSingle();
  if (!site) return NextResponse.json({ error: "Site não encontrado" }, { status: 404 });

  // Dispara via Inngest (async)
  await emit({
    name: "ddg/post.generate",
    data: {
      site_id: siteId,
      type,
      topic: body.topic,
      target_keyword: body.target_keyword,
      target_question: body.target_question,
      mode: body.mode === "single_pass" ? "single_pass" : "multi_pass",
    },
  });

  const response = NextResponse.json(
    { data: { status: "queued", message: "Geração enfileirada" } },
    { status: 202 }
  );

  void logApiRequest({
    apiKeyId: auth.keyId,
    organizationId: auth.orgId,
    method: "POST",
    path: "/api/v1/posts",
    statusCode: response.status,
    responseTimeMs: Date.now() - start,
  });

  return response;
}
