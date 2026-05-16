/**
 * Endpoints públicos que disparam eventos Inngest.
 *
 * Usados por:
 * - Vercel Cron (vercel.json com schedule)
 * - Supabase pg_cron (chama via pg_net)
 * - GitHub Actions (cron workflow)
 *
 * Protegidos por CRON_SECRET (passado no header Authorization).
 *
 * Eventos suportados:
 * - /api/cron/visibility-weekly      → ddg/visibility.run-all
 * - /api/cron/metrics-daily          → ddg/metrics.sync-all
 * - /api/cron/reports-monthly        → ddg/report.monthly-all
 * - /api/cron/workers-hourly         → ddg/worker.healthcheck-all
 */
import { NextRequest, NextResponse } from "next/server";
import { emit, type DDGEvent } from "@/lib/inngest/client";

export const dynamic = "force-dynamic";

const EVENT_MAP: Record<string, DDGEvent> = {
  "visibility-weekly": {
    name: "ddg/visibility.run-all",
    data: { trigger: "weekly_cron" },
  },
  "metrics-daily": {
    name: "ddg/metrics.sync-all",
    data: { trigger: "daily_cron" },
  },
  "reports-monthly": {
    name: "ddg/report.monthly-all",
    data: { trigger: "monthly_cron" },
  },
  "workers-hourly": {
    name: "ddg/worker.healthcheck-all",
    data: { trigger: "hourly_cron" },
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ event: string }> }
) {
  // Autenticação simples por bearer secret
  const authHeader = request.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET ?? "";
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 500 });
  }
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { event } = await params;
  const evt = EVENT_MAP[event];
  if (!evt) {
    return NextResponse.json({ error: `Evento desconhecido: ${event}` }, { status: 404 });
  }

  try {
    const result = await emit(evt);
    return NextResponse.json({ ok: true, event: evt.name, ids: result.ids });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}

// POST funciona igual (alguns crons preferem POST)
export const POST = GET;
