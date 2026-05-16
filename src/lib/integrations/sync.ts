/**
 * Sync de métricas das integrações (GSC + GA4).
 *
 * Lê access_token armazenado em site_integrations (com refresh automático
 * via googleapis).
 *
 * Salva snapshot diário em metrics_daily.
 */
import { createServiceClient } from "@/lib/supabase/server";
import { google } from "googleapis";

export async function syncSiteMetrics(siteId: string, periodDays = 30) {
  const supabase = createServiceClient();

  const { data: site } = await supabase
    .from("sites")
    .select("id, domain")
    .eq("id", siteId)
    .single();
  if (!site) throw new Error("Site não encontrado");

  const { data: integrations } = await supabase
    .from("site_integrations")
    .select("*")
    .eq("site_id", siteId)
    .eq("status", "active");

  let syncedDays = 0;

  for (const integ of integrations ?? []) {
    if (integ.provider === "google_search_console") {
      syncedDays += await syncGSC(siteId, site.domain as string, integ);
    } else if (integ.provider === "google_analytics_4") {
      syncedDays += await syncGA4(siteId, integ);
    }
  }

  return { syncedDays };
}

async function syncGSC(siteId: string, domain: string, integration: any): Promise<number> {
  const supabase = createServiceClient();

  const oauth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth.setCredentials({
    access_token: integration.access_token,
    refresh_token: integration.refresh_token,
    expiry_date: integration.expires_at ? new Date(integration.expires_at).getTime() : undefined,
  });

  const sc = google.searchconsole({ version: "v1", auth: oauth });

  const siteUrl = integration.external_id || `sc-domain:${domain}`;
  const today = new Date();
  const startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  try {
    const res = await sc.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: startDate.toISOString().slice(0, 10),
        endDate: today.toISOString().slice(0, 10),
        dimensions: ["date"],
        rowLimit: 1000,
      },
    });

    const rows = res.data.rows ?? [];
    for (const r of rows) {
      const date = r.keys?.[0];
      if (!date) continue;
      await supabase
        .from("metrics_daily")
        .upsert({
          site_id: siteId,
          date,
          gsc_impressions: Math.round(r.impressions ?? 0),
          gsc_clicks: Math.round(r.clicks ?? 0),
          gsc_ctr: r.ctr ?? 0,
          gsc_position: r.position ?? 0,
        }, { onConflict: "site_id,date" });
    }

    await supabase
      .from("site_integrations")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", integration.id);

    return rows.length;
  } catch (err) {
    await supabase
      .from("site_integrations")
      .update({ status: "error", metadata: { error: err instanceof Error ? err.message : "unknown" } })
      .eq("id", integration.id);
    return 0;
  }
}

async function syncGA4(siteId: string, integration: any): Promise<number> {
  const supabase = createServiceClient();

  const oauth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth.setCredentials({
    access_token: integration.access_token,
    refresh_token: integration.refresh_token,
  });

  const data = google.analyticsdata({ version: "v1beta", auth: oauth });

  try {
    const propertyId = integration.external_id;
    if (!propertyId) return 0;

    const res = await data.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: "30daysAgo", endDate: "yesterday" }],
        dimensions: [{ name: "date" }],
        metrics: [
          { name: "screenPageViews" },
          { name: "sessions" },
          { name: "activeUsers" },
        ],
      },
    });

    const rows = res.data.rows ?? [];
    for (const row of rows) {
      const rawDate = row.dimensionValues?.[0]?.value; // YYYYMMDD
      if (!rawDate) continue;
      const date = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
      await supabase
        .from("metrics_daily")
        .upsert({
          site_id: siteId,
          date,
          pageviews: Number(row.metricValues?.[0]?.value ?? 0),
          sessions: Number(row.metricValues?.[1]?.value ?? 0),
          unique_visitors: Number(row.metricValues?.[2]?.value ?? 0),
        }, { onConflict: "site_id,date" });
    }

    await supabase
      .from("site_integrations")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", integration.id);

    return rows.length;
  } catch (err) {
    await supabase
      .from("site_integrations")
      .update({ status: "error", metadata: { error: err instanceof Error ? err.message : "unknown" } })
      .eq("id", integration.id);
    return 0;
  }
}
