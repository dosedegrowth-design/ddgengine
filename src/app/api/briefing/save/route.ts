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
import { embed } from "@/lib/ai/embeddings";
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

    // Pega site da org (assumimos 1 site por org no MVP)
    let { data: site } = await supabase
      .from("sites")
      .select("id")
      .eq("organization_id", orgId)
      .limit(1)
      .maybeSingle();

    // Se site_url veio e ainda não há site, cria
    if (!site && body.site_url) {
      const domain = extractDomain(body.site_url);
      // tenant_slug é UNIQUE global — usa org slug + domain + entropy
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

    // Se completed → gera embedding pro Brand RAG
    if (body.completion_status === "completed" && body.refined_brief) {
      try {
        const embText = briefToEmbeddingText(body.refined_brief);
        const embedding = await embed(embText);
        await supabase
          .from("briefings")
          .update({ embedding })
          .eq("id", briefingId);
      } catch (err) {
        console.error("[/api/briefing/save] embedding falhou:", err);
        // não falha o save por causa do embedding
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
  return {
    business_description: brief.identity?.description ?? null,
    services: brief.positioning?.differentials ?? [],
    region: null, // não temos esse campo nas 12 perguntas; preencher depois
    competitors: brief.market?.competitors ?? [],
    target_keywords: brief.seo?.primary_keywords ?? [],
    faq_questions: brief.visibility_goal?.target_questions ?? [],
    tone_of_voice: brief.voice?.tone ?? null,
    differentials: brief.positioning?.differentials ?? [],
  };
}

/**
 * Texto plano consolidado pra gerar embedding (Brand RAG).
 */
function briefToEmbeddingText(brief: RefinedBrief): string {
  const parts: string[] = [];
  if (brief.identity?.elevator_pitch) parts.push(brief.identity.elevator_pitch);
  if (brief.audience?.ideal_customer) parts.push(`Cliente ideal: ${brief.audience.ideal_customer}`);
  if (brief.audience?.main_pain) parts.push(`Dor: ${brief.audience.main_pain}`);
  if (brief.positioning?.unique_value) parts.push(`Valor único: ${brief.positioning.unique_value}`);
  if (brief.positioning?.differentials?.length)
    parts.push(`Diferenciais: ${brief.positioning.differentials.join("; ")}`);
  if (brief.voice?.tone) parts.push(`Tom: ${brief.voice.tone}`);
  if (brief.voice?.style_notes) parts.push(brief.voice.style_notes);
  if (brief.seo?.primary_keywords?.length)
    parts.push(`Keywords: ${brief.seo.primary_keywords.join(", ")}`);
  if (brief.storytelling?.case_summaries?.length)
    parts.push(`Cases: ${brief.storytelling.case_summaries.join(" | ")}`);
  return parts.join("\n\n");
}

function extractDomain(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
