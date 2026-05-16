/**
 * GET /api/health — health check endpoint.
 *
 * Usado por: Better Stack uptime, Vercel, Cloudflare, monitoring tools.
 * Retorna JSON com status de subsistemas.
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, { ok: boolean; ms?: number; message?: string }> = {};
  const start = Date.now();

  // 1. Supabase
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const s = Date.now();
    try {
      const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
      });
      checks.supabase = { ok: r.ok || r.status === 401, ms: Date.now() - s };
    } catch (err) {
      checks.supabase = { ok: false, ms: Date.now() - s, message: (err as Error).message };
    }
  }

  // 2. Configuration
  checks.config = {
    ok: !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
    message: "Required env vars present",
  };

  const allOk = Object.values(checks).every((c) => c.ok);
  const status = allOk ? 200 : 503;

  return NextResponse.json(
    {
      ok: allOk,
      timestamp: new Date().toISOString(),
      uptime_ms: Date.now() - start,
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
      environment: process.env.VERCEL_ENV ?? "local",
      region: process.env.VERCEL_REGION ?? "unknown",
      checks,
    },
    { status }
  );
}
