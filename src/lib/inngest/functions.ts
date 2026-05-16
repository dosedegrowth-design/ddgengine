/**
 * Inngest functions — jobs durables que rodam em background.
 *
 * Inngest v4 API: createFunction({ id, triggers: [...] }, handler).
 */
import { inngest } from "./client";
import { runVisibilityTracking } from "@/lib/visibility/tracker";
import { deployWorkerForSite, healthCheckWorker } from "@/lib/cloudflare/deploy";
import { syncSiteMetrics } from "@/lib/integrations/sync";
import { generateMonthlyReport } from "@/lib/reports/generator";
import { generatePostMultiPass } from "@/lib/ai/multi-pass";
import { generatePost } from "@/lib/ai/generate";
import { processBriefingEmbeddings } from "@/lib/rag/brand";
import { createServiceClient } from "@/lib/supabase/server";

// ============ VISIBILITY ============
export const visibilityRun = inngest.createFunction(
  {
    id: "visibility-run",
    concurrency: { limit: 5 },
    triggers: [{ event: "ddg/visibility.run" }],
  },
  async (ctx: any) => {
    const siteId = ctx.event.data.site_id;
    return ctx.step.run("run-tracking", async () => runVisibilityTracking(siteId));
  }
);

export const visibilityRunAll = inngest.createFunction(
  { id: "visibility-run-all", triggers: [{ event: "ddg/visibility.run-all" }] },
  async (ctx: any) => {
    const sites = await ctx.step.run("list-active-sites", async () => {
      const supabase = createServiceClient();
      const { data } = await supabase.from("sites").select("id").eq("status", "active");
      return data ?? [];
    });

    const events = (sites as { id: string }[]).map((s) => ({
      name: "ddg/visibility.run",
      data: { site_id: s.id },
    }));

    if (events.length > 0) {
      await ctx.step.sendEvent("fanout-visibility", events);
    }
    return { fanned_out: events.length };
  }
);

// ============ WORKER ============
export const workerDeploy = inngest.createFunction(
  {
    id: "worker-deploy",
    concurrency: { limit: 3 },
    triggers: [{ event: "ddg/worker.deploy" }],
  },
  async (ctx: any) => {
    const siteId = ctx.event.data.site_id;
    return ctx.step.run("deploy", async () => deployWorkerForSite(siteId));
  }
);

export const workerHealthcheckAll = inngest.createFunction(
  { id: "worker-healthcheck-all", triggers: [{ event: "ddg/worker.healthcheck-all" }] },
  async (ctx: any) => {
    const workers = await ctx.step.run("list-workers", async () => {
      const supabase = createServiceClient();
      const { data } = await supabase
        .from("cloudflare_workers")
        .select("site_id")
        .eq("status", "deployed");
      return data ?? [];
    });

    let healthy = 0;
    let unhealthy = 0;
    for (const w of workers as { site_id: string }[]) {
      const result = await ctx.step.run(`hc-${w.site_id}`, async () =>
        healthCheckWorker(w.site_id)
      );
      if (result.ok) healthy++;
      else unhealthy++;
    }
    return { healthy, unhealthy, total: (workers as any[]).length };
  }
);

// ============ METRICS SYNC ============
export const metricsSync = inngest.createFunction(
  {
    id: "metrics-sync",
    concurrency: { limit: 5 },
    triggers: [{ event: "ddg/metrics.sync" }],
  },
  async (ctx: any) => {
    return ctx.step.run("sync", async () =>
      syncSiteMetrics(ctx.event.data.site_id, ctx.event.data.period_days ?? 30)
    );
  }
);

export const metricsSyncAll = inngest.createFunction(
  { id: "metrics-sync-all", triggers: [{ event: "ddg/metrics.sync-all" }] },
  async (ctx: any) => {
    const sites = await ctx.step.run("list-sites-with-integrations", async () => {
      const supabase = createServiceClient();
      const { data } = await supabase
        .from("site_integrations")
        .select("site_id")
        .eq("status", "active")
        .in("provider", ["google_search_console", "google_analytics_4"]);
      const unique = Array.from(new Set((data ?? []).map((s: any) => s.site_id)));
      return unique;
    });

    const events = (sites as string[]).map((id) => ({
      name: "ddg/metrics.sync",
      data: { site_id: id },
    }));
    if (events.length > 0) {
      await ctx.step.sendEvent("fanout-metrics", events);
    }
    return { fanned_out: events.length };
  }
);

// ============ REPORTS ============
export const reportMonthly = inngest.createFunction(
  {
    id: "report-monthly",
    concurrency: { limit: 5 },
    triggers: [{ event: "ddg/report.monthly" }],
  },
  async (ctx: any) => {
    return ctx.step.run("generate", async () =>
      generateMonthlyReport(ctx.event.data.site_id, ctx.event.data.period_start)
    );
  }
);

export const reportMonthlyAll = inngest.createFunction(
  { id: "report-monthly-all", triggers: [{ event: "ddg/report.monthly-all" }] },
  async (ctx: any) => {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      .toISOString()
      .slice(0, 10);

    const sites = await ctx.step.run("list-active-sites", async () => {
      const supabase = createServiceClient();
      const { data } = await supabase.from("sites").select("id").eq("status", "active");
      return data ?? [];
    });

    const events = (sites as { id: string }[]).map((s) => ({
      name: "ddg/report.monthly",
      data: { site_id: s.id, period_start: periodStart },
    }));
    if (events.length > 0) await ctx.step.sendEvent("fanout-reports", events);
    return { fanned_out: events.length };
  }
);

// ============ POST GENERATION ============
export const postGenerate = inngest.createFunction(
  {
    id: "post-generate",
    concurrency: { limit: 3 },
    retries: 2,
    triggers: [{ event: "ddg/post.generate" }],
  },
  async (ctx: any) => {
    return ctx.step.run("generate", async () => {
      const args = {
        siteId: ctx.event.data.site_id,
        type: ctx.event.data.type,
        topic: ctx.event.data.topic,
        targetKeyword: ctx.event.data.target_keyword,
        targetQuestion: ctx.event.data.target_question,
      };
      return ctx.event.data.mode === "single_pass"
        ? generatePost(args)
        : generatePostMultiPass(args);
    });
  }
);

// ============ BRIEFING EMBEDDINGS ============
export const briefingEmbed = inngest.createFunction(
  {
    id: "briefing-embed",
    concurrency: { limit: 5 },
    triggers: [{ event: "ddg/briefing.embed" }],
  },
  async (ctx: any) => {
    return ctx.step.run("embed", async () =>
      processBriefingEmbeddings(ctx.event.data.briefing_id)
    );
  }
);

export const allFunctions = [
  visibilityRun,
  visibilityRunAll,
  workerDeploy,
  workerHealthcheckAll,
  metricsSync,
  metricsSyncAll,
  reportMonthly,
  reportMonthlyAll,
  postGenerate,
  briefingEmbed,
];
