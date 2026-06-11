/**
 * POST /api/briefing/save — persiste briefing no Supabase
 *
 * Body JSON: {
 *   raw_answers: RawAnswers,
 *   refined_brief?: RefinedBrief,
 *   mode: 'guided' | 'audio_free' | 'minimal',
 *   completion_status: 'in_progress' | 'review' | 'completed',
 *   site_url?: string  // pra criar/atualizar site da org
 * }
 *
 * Estratégia:
 * 1. Upsert briefing da org (1 por organização — versionado)
 * 2. Se completion_status='completed': gera embedding pro Brand RAG
 * 3. Mapeia campos pra colunas legadas (business_description, services, etc)
 *    pra não quebrar Visibility Tracker
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processBriefingEmbeddings } from "@/lib/rag/brand";
import { emit } from "@/lib/inngest/client";
import { slugify } from "@/lib/utils";
import type { RawAnswers, RefinedBrief } from "@/lib/briefing/questions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SaveBody {
  raw_answers: RawAnswers;
  refined_brief?: RefinedBrief;
  mode?: "guided" | "audio_free" | "minimal";
  completion_status: "in_progress" | "review" | "completed";
  site_url?: string;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Acha org do user
    const { data: membership } = await supabase
      .from("org_memberships")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();
    if (!membership) {
      return NextResponse.json({ error: "Sem organização" }, { status: 400 });
    }
    const orgId = membership.organization_id;

    const body = (await req.json()) as SaveBody;
    if (!body.raw_answers) {
      return NextResponse.json(
        { error: "raw_answers obrigatório" },
        { status: 400 }
      );
    }

    // Resolve site: se body.site_url veio, procura pelo (org, domain) exato
    // (constraint UNIQUE) e reusa. Se não existir, cria. Se não veio site_url
    // mas a org já tem algum site, usa o primeiro.
    let site: { id: string } | null = null;

    if (body.site_url) {
      const domain = extractDomain(body.site_url);

      // 1) Procura site EXATO por (org, domain) — reusa se já existe
      const { data: existing } = await supabase
        .from("sites")
        .select("id")
        .eq("organization_id", orgId)
        .eq("domain", domain)
        .maybeSingle();

      if (existing) {
        site = existing;
      } else {
        // 2) Não existe esse domain — cria
        const { data: orgData } = await supabase
          .from("organizations")
          .select("slug")
          .eq("id", orgId)
          .single();
        const orgSlug = orgData?.slug ?? "org";
        const tenantSlug = `${slugify(orgSlug)}-${domain.replace(/\./g, "-")}-${Math.random()
          .toString(36)
          .slice(2, 6)}`;

        const { data: newSite, error } = await supabase
          .from("sites")
          .insert({
            organization_id: orgId,
            domain,
            tenant_slug: tenantSlug,
            status: "pending",
          })
          .select("id")
          .single();
        if (error) throw error;
        site = newSite;
      }
    } else {
      // Sem site_url no body — pega qualquer site existente da org pra anexar briefing
      const { data: anySite } = await supabase
        .from("sites")
        .select("id")
        .eq("organization_id", orgId)
        .limit(1)
        .maybeSingle();
      site = anySite;
    }

    // Mapeia refined_brief pra colunas legadas (compatível com Visibility Tracker)
    const legacyFields = body.refined_brief
      ? mapRefinedToLegacy(body.refined_brief)
      : {};

    // Upsert briefing
    const briefingPayload = {
      organization_id: orgId,
      site_id: site?.id ?? null,
      raw_answers: body.raw_answers,
      refined_brief: body.refined_brief ?? null,
      mode: body.mode ?? "guided",
      completion_status: body.completion_status,
      completed_at: body.completion_status === "completed" ? new Date().toISOString() : null,
      ...legacyFields,
    };

    const { data: existing } = await supabase
      .from("briefings")
      .select("id")
      .eq("organization_id", orgId)
      .limit(1)
      .maybeSingle();

    let briefingId: string;
    if (existing) {
      const { error } = await supabase
        .from("briefings")
        .update(briefingPayload)
        .eq("id", existing.id);
      if (error) throw error;
      briefingId = existing.id;
    } else {
      const { data: created, error } = await supabase
        .from("briefings")
        .insert(briefingPayload)
        .select("id")
        .single();
      if (error) throw error;
      briefingId = created.id;
    }

    // Se completed → processa Brand RAG (chunks → embeddings → brand_documents)
    if (body.completion_status === "completed") {
      // 1) Tenta disparar Inngest (preferido — durable, retry, fora do request).
      //    Se INNGEST_EVENT_KEY não estiver setado, o send retorna sem erro
      //    mas nada acontece — por isso temos o fallback inline abaixo.
      let inngestDispatched = false;
      if (process.env.INNGEST_EVENT_KEY) {
        try {
          await emit({
            name: "ddg/briefing.embed",
            data: { briefing_id: briefingId },
          });
          inngestDispatched = true;
        } catch (err) {
          console.warn(
            "[/api/briefing/save] inngest dispatch falhou, vai cair no inline:",
            err instanceof Error ? err.message : err
          );
        }
      }

      // 2) Fallback inline: roda direto no contexto do request.
      //    Adiciona ~5-15s ao submit final mas é o passo onde o user
      //    espera "calculando voz da marca" — tolerável em UX.
      //    Se falhar, marca como pending e cliente pode pedir re-trigger
      //    via backfill admin (ou tenta de novo no proximo save).
      if (!inngestDispatched) {
        try {
          await processBriefingEmbeddings(briefingId);
        } catch (err) {
          console.error(
            "[/api/briefing/save] processBriefingEmbeddings falhou:",
            err instanceof Error ? err.message : err
          );
          // Marca status como 'failed' pra backfill identificar
          await supabase
            .from("briefings")
            .update({ embedding_status: "failed" })
            .eq("id", briefingId);
          // NÃO falha o save — briefing tá salvo, RAG pode ser feito depois
        }
      }
    }

    return NextResponse.json({ briefing_id: briefingId, site_id: site?.id });
  } catch (err) {
    // PostgrestError não é instanceof Error — extrai campos manualmente
    const isPgError = typeof err === "object" && err !== null && "message" in err;
    const pgErr = isPgError ? (err as { message?: string; code?: string; details?: string; hint?: string }) : null;
    const msg = pgErr?.message ?? (err instanceof Error ? err.message : "Erro desconhecido");
    console.error("[/api/briefing/save]", JSON.stringify({
      message: msg,
      code: pgErr?.code,
      details: pgErr?.details,
      hint: pgErr?.hint,
    }));
    return NextResponse.json({ error: msg, code: pgErr?.code }, { status: 500 });
  }
}

/**
 * Mapeia RefinedBrief → colunas legadas usadas pelo Visibility Tracker.
 */
function mapRefinedToLegacy(brief: RefinedBrief) {
  // IMPORTANTE: nomes precisam bater com colunas REAIS de ddg_engine.briefings:
  // business_description, services (jsonb), region, competitors (jsonb),
  // target_keywords (array), faq_questions (jsonb), differentiator (text singular),
  // tone_formal/casual/technical/didactic (integers 0-10 não usados aqui).
  //
  // O texto humano de tom de voz vive em refined_brief.voice.tone (jsonb).
  return {
    business_description: brief.identity?.description ?? null,
    services: brief.positioning?.differentials ?? [],
    region: null,
    competitors: brief.market?.competitors ?? [],
    target_keywords: brief.seo?.primary_keywords ?? [],
    faq_questions: brief.visibility_goal?.target_questions ?? [],
    differentiator:
      brief.positioning?.unique_value ||
      brief.positioning?.differentials?.[0] ||
      null,
  };
}

function extractDomain(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
