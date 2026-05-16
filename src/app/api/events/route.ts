/**
 * Server-Sent Events (SSE) — atualizações em tempo real pro painel.
 *
 * Eventos transmitidos:
 * - post.status.changed (draft → generating → in_review → published)
 * - visibility.run.progress (progresso do tracker)
 * - notification.new (notificação in-app nova)
 *
 * Cliente conecta com EventSource(/api/events).
 *
 * Implementação MVP: polling do Supabase a cada 5s.
 * Versão final: usar Supabase Realtime (postgres_changes).
 */
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Acha org do user
  const { data: memberships } = await supabase
    .from("org_memberships")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1);
  const orgId = memberships?.[0]?.organization_id;
  if (!orgId) {
    return new Response("No org", { status: 404 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      function send(event: string, data: unknown) {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // controller fechado
        }
      }

      // Heartbeat inicial
      send("connected", { ts: Date.now() });

      let lastPostUpdate = new Date().toISOString();
      let lastVisibilityUpdate = new Date().toISOString();

      const interval = setInterval(async () => {
        try {
          // Heartbeat (keepalive)
          send("ping", { ts: Date.now() });

          // Poll de posts atualizados
          const { data: posts } = await supabase
            .from("posts")
            .select("id, status, title, updated_at, sites!inner(organization_id)")
            .eq("sites.organization_id", orgId)
            .gt("updated_at", lastPostUpdate)
            .order("updated_at", { ascending: false })
            .limit(10);

          if (posts && posts.length > 0) {
            for (const p of posts) {
              send("post.updated", {
                id: p.id,
                status: p.status,
                title: p.title,
              });
            }
            lastPostUpdate = posts[0].updated_at as string;
          }

          // Poll de visibility runs
          const { data: vRuns } = await supabase
            .from("ai_visibility_runs")
            .select("id, status, total_citations, completed_at, sites!inner(organization_id)")
            .eq("sites.organization_id", orgId)
            .gt("started_at", lastVisibilityUpdate)
            .limit(5);

          if (vRuns && vRuns.length > 0) {
            for (const v of vRuns) {
              send("visibility.updated", {
                id: v.id,
                status: v.status,
                citations: v.total_citations,
              });
            }
            lastVisibilityUpdate = new Date().toISOString();
          }
        } catch (err) {
          console.error("SSE poll error:", err);
        }
      }, 5000);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // ignora
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
