/**
 * GET /api/v1/metrics?site_id=X&days=30
 */
import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest, logApiRequest } from "@/lib/api/keys";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const start = Date.now();
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("site_id");
  const days = Math.min(parseInt(searchParams.get("days") ?? "30", 10), 365);

  if (!siteId) {
    return NextResponse.json({ error: "site_id é obrigatório" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: site } = await supabase
    .from("sites")
    .select("id")
    .eq("id", siteId)
    .eq("organization_id", auth.orgId)
    .maybeSingle();
  if (!site) return NextResponse.json({ error: "Site não pertence à sua org" }, { status: 403 });

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: metrics } = await supabase
    .from("metrics_daily")
    .select("date, pageviews, sessions, unique_visitors, gsc_impressions, gsc_clicks, gsc_ctr, gsc_position, ai_citations")
    .eq("site_id", siteId)
    .gte("date", startDate.toISOString().slice(0, 10))
    .order("date", { ascending: true });

  const response = NextResponse.json({ data: metrics ?? [] });

  void logApiRequest({
    apiKeyId: auth.keyId,
    organizationId: auth.orgId,
    method: "GET",
    path: "/api/v1/metrics",
    statusCode: response.status,
    responseTimeMs: Date.now() - start,
  });

  return response;
}
