/**
 * API DE AGÊNCIA — usada pelo Radar DDG pra operar o Conteudai por fora (todos os sites, sem login de cliente).
 * Guardada por header `x-agency-secret` = env CONTEUDAI_AGENCY_SECRET. Reusa as libs da engine (nada duplicado).
 *
 * GET  /api/agency/sites                      lista de sites (todas as orgs) com contagens
 * GET  /api/agency/site?site_id=              site + briefing + resumo do universo + categorias + integrações
 * GET  /api/agency/posts?site_id=&status=&limit=
 * GET  /api/agency/post?id=                   post completo (markdown, html, scores) + relatório SEO on-page
 * GET  /api/agency/keywords?site_id=&limit=   universo (oportunidades) + resumo
 * GET  /api/agency/keyword-ideas?seed=        Keyword Planner (volume/concorrência)
 * GET  /api/agency/topics?site_id=            sugestões de tema (briefing + universo)
 * GET  /api/agency/visibility?site_id=        runs + citações da última
 * GET  /api/agency/metrics?site_id=&days=     GSC/GA4 diário
 * GET  /api/agency/activity?site_id=          audit_log
 * GET  /api/agency/categories?site_id=
 * POST /api/agency/site/create {domain, name, org_name?}         cria org + site (agência)
 * POST /api/agency/site/update {site_id, ...campos permitidos}
 * POST /api/agency/briefing/save {site_id, data} · briefing/submit {site_id}
 * POST /api/agency/post/generate {site_id, type, topic, target_keyword, target_question, extra_notes}
 * POST /api/agency/post/from-source {site_id, type, url, raw_text, angle, target_keyword} · post/source-preview {url}
 * POST /api/agency/post/approve|reject|delete {id} · post/save {id, title, meta_description, content_markdown}
 * POST /api/agency/post/repurpose {id, format: newsletter|linkedin|twitter|instagram|lead_magnet|translate_en|translate_es}
 * POST /api/agency/keywords/refresh {site_id} · autopilot {site_id, enabled, posts_per_week}
 * POST /api/agency/visibility/run {site_id} · metrics/sync {site_id, days}
 * POST /api/agency/audit {site_id}
 * POST /api/agency/categories/create|update|delete {site_id, id?, name, description} · categories/suggest {site_id}
 * POST /api/agency/domain/initiate {site_id} · domain/verify {site_id}
 */
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { enqueueGeneration } from "@/lib/ai/generate-resumable";
import { extractFromUrl } from "@/lib/ai/source-extract";
import { analyzePost } from "@/lib/seo/analyze-post";
import { refreshKeywordUniverse, getTopOpportunities, getUniverseSummary } from "@/lib/seo/keyword-universe";
import { generateKeywordIdeas } from "@/lib/seo/keyword-research";
import { suggestTopics } from "@/lib/briefing/suggest-topics";
import { processBriefingEmbeddings } from "@/lib/rag/brand";
import { runVisibilityTracking } from "@/lib/visibility/tracker";
import { syncSiteMetrics } from "@/lib/integrations/sync";
import { auditSite } from "@/lib/audit/index";
import { slugify } from "@/lib/utils";
import { addProjectDomain, getProjectDomainStatus } from "@/lib/vercel/domains";
import { refineBriefing } from "@/lib/briefing/refine";
import { BRIEFING_QUESTIONS, type RawAnswers, type RefinedBrief } from "@/lib/briefing/questions";
import { suggestCategories } from "@/lib/blog/suggest-categories";
import { signApprovalToken } from "@/lib/whatsapp/notifications";
import { buildAuthUrl } from "@/lib/integrations/oauth-google";
import { importWordPressBlog } from "@/lib/imports/wordpress";
import { generateNewsletter, generateLinkedInPost, generateTwitterThread, generateInstagramCarousel, generateLeadMagnet, translatePost } from "@/lib/ai/repurpose";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ok = (data: unknown, status = 200) => NextResponse.json(data, { status });
const erro = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });

function autorizado(req: NextRequest) {
  const s = process.env.CONTEUDAI_AGENCY_SECRET;
  return !!s && req.headers.get("x-agency-secret") === s;
}

const SITE_CAMPOS = "id, organization_id, domain, tenant_slug, status, audit_score, audit_run_at, stack_detected, has_cloudflare, blog_host, subdomain, cname_target, cname_verified, integration_state, autopilot_enabled, autopilot_posts_per_week, autopilot_last_run_at, keyword_universe_synced_at, gsc_property_url, gsc_connected_at, ga4_property_id, ga4_connected_at, vertical, blog_template, created_at";

export async function GET(req: NextRequest, ctx: { params: Promise<{ op: string[] }> }) {
  if (!autorizado(req)) return erro("nao autorizado", 401);
  const { op } = await ctx.params;
  const q = req.nextUrl.searchParams;
  const sb = createServiceClient();
  const siteId = q.get("site_id") || "";
  try {
    switch (op.join("/")) {
      case "sites": {
        const { data: sites } = await sb.from("sites").select(`${SITE_CAMPOS}, organizations(name, slug)`).order("created_at", { ascending: false });
        const ids = (sites ?? []).map((s: { id: string }) => s.id);
        const { data: posts } = ids.length ? await sb.from("posts").select("site_id, status").in("site_id", ids) : { data: [] };
        const cont: Record<string, { total: number; publicados: number; pendentes: number }> = {};
        for (const p of (posts ?? []) as { site_id: string; status: string }[]) { const c = (cont[p.site_id] ||= { total: 0, publicados: 0, pendentes: 0 }); c.total++; if (p.status === "published") c.publicados++; if (p.status === "in_review") c.pendentes++; }
        return ok({ sites: (sites ?? []).map((s: Record<string, unknown>) => ({ ...s, posts: cont[String(s.id)] || { total: 0, publicados: 0, pendentes: 0 } })) });
      }
      case "site": {
        if (!siteId) return erro("site_id");
        const { data: site } = await sb.from("sites").select(`${SITE_CAMPOS}, organizations(name, slug)`).eq("id", siteId).maybeSingle();
        if (!site) return erro("site nao encontrado", 404);
        const [{ data: briefing }, { data: categorias }, { data: integ }] = await Promise.all([
          sb.from("briefings").select("id, organization_id, site_id, raw_answers, refined_brief, mode, completion_status, completed_at, embedding_status, updated_at").eq("organization_id", site.organization_id).limit(1).maybeSingle(),
          sb.from("blog_categories").select("*").eq("site_id", siteId).order("name"),
          sb.from("site_integrations").select("id, provider, status, external_id, last_synced_at, created_at").eq("site_id", siteId),
        ]);
        const universo = await getUniverseSummary(siteId).catch(() => null);
        return ok({ site, briefing, perguntas: BRIEFING_QUESTIONS, categorias: categorias ?? [], integracoes: integ ?? [], universo });
      }
      case "posts": {
        if (!siteId) return erro("site_id");
        let query = sb.from("posts").select("id, site_id, type, slug, title, meta_description, status, target_keyword, target_question, quality_scores, quality_passed, cost_usd, published_at, created_at, updated_at, pageviews_30d, gsc_impressions_30d, gsc_clicks_30d, ai_citations_30d, gen_stage, gen_error, category_id").eq("site_id", siteId).order("created_at", { ascending: false }).limit(Math.min(Number(q.get("limit") || 100), 300));
        if (q.get("status")) query = query.eq("status", String(q.get("status")));
        const { data } = await query;
        return ok({ posts: data ?? [] });
      }
      case "post": {
        const id = q.get("id"); if (!id) return erro("id");
        const { data: post } = await sb.from("posts").select("*").eq("id", id).maybeSingle();
        if (!post) return erro("post nao encontrado", 404);
        const { data: site } = await sb.from("sites").select("domain, blog_host").eq("id", post.site_id).maybeSingle();
        const seo = analyzePost({ type: (post.type as "long_form" | "faq_page") ?? "long_form", title: post.title ?? "", content: post.content_markdown ?? "", metaDescription: post.meta_description, slug: post.slug, schemaMarkup: (post.schema_markup as unknown[] | null) ?? null, focusKeyword: post.target_keyword });
        const url = site?.blog_host ? `https://${site.blog_host}/${post.slug}` : null;
        return ok({ post, seo, url });
      }
      case "keywords": {
        if (!siteId) return erro("site_id");
        const [top, resumo] = await Promise.all([getTopOpportunities(siteId, Math.min(Number(q.get("limit") || 60), 300)), getUniverseSummary(siteId)]);
        const { data: todas } = await sb.from("keyword_universe").select("keyword, volume, competition, competition_index, trend, opportunity_score, status, post_id, discovered_at").eq("site_id", siteId).order("opportunity_score", { ascending: false }).limit(300);
        return ok({ oportunidades: top, resumo, universo: todas ?? [] });
      }
      case "keyword-ideas": {
        const seed = q.get("seed") || ""; if (!seed) return erro("seed");
        return ok(await generateKeywordIdeas(seed.split(",").map((s) => s.trim()).filter(Boolean), Math.min(Number(q.get("limit") || 40), 100)));
      }
      case "topics": {
        if (!siteId) return erro("site_id");
        const { data: site } = await sb.from("sites").select("organization_id").eq("id", siteId).maybeSingle();
        if (!site) return erro("site nao encontrado", 404);
        return ok({ topics: await suggestTopics(site.organization_id, siteId) });
      }
      case "visibility": {
        if (!siteId) return erro("site_id");
        const { data: runs } = await sb.from("ai_visibility_runs").select("*").eq("site_id", siteId).order("week_start", { ascending: false }).limit(12);
        const ultima = runs?.[0];
        const { data: cit } = ultima ? await sb.from("ai_visibility_citations").select("prompt, llm, brand_mentioned, url_cited, sentiment, position, competitors_mentioned, response_text").eq("run_id", ultima.id).order("llm") : { data: [] };
        return ok({ runs: runs ?? [], citacoes: cit ?? [] });
      }
      case "metrics": {
        if (!siteId) return erro("site_id");
        const dias = Math.min(Number(q.get("days") || 30), 365);
        const desde = new Date(Date.now() - dias * 864e5).toISOString().slice(0, 10);
        const { data } = await sb.from("metrics_daily").select("date, pageviews, sessions, unique_visitors, gsc_impressions, gsc_clicks, gsc_ctr, gsc_position, ai_citations, ai_share_of_voice, lighthouse_performance, lighthouse_seo").eq("site_id", siteId).gte("date", desde).order("date");
        return ok({ metricas: data ?? [] });
      }
      case "activity": {
        if (!siteId) return erro("site_id");
        const { data: site } = await sb.from("sites").select("organization_id").eq("id", siteId).maybeSingle();
        const { data } = await sb.from("audit_log").select("*").eq("organization_id", site?.organization_id || "").order("created_at", { ascending: false }).limit(80);
        return ok({ eventos: data ?? [] });
      }
      case "categories": {
        if (!siteId) return erro("site_id");
        const { data } = await sb.from("blog_categories").select("*").eq("site_id", siteId).order("name");
        return ok({ categorias: data ?? [] });
      }
      case "oauth-url": {
        // link de conexão do Search Console / GA4 pra qualquer site: o callback do Conteudai salva o token pelo state assinado
        if (!siteId) return erro("site_id");
        const prov = q.get("provider") === "google_analytics_4" ? "google_analytics_4" : "google_search_console";
        const url = buildAuthUrl({ scope: prov === "google_analytics_4" ? "analytics" : "search_console", state: signApprovalToken(`${siteId}:${prov}`) });
        return ok({ url });
      }
      default: return erro(`operacao desconhecida: ${op.join("/")}`, 404);
    }
  } catch (e) { return erro(e instanceof Error ? e.message : String(e), 500); }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ op: string[] }> }) {
  if (!autorizado(req)) return erro("nao autorizado", 401);
  const { op } = await ctx.params;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const sb = createServiceClient();
  const siteId = String(b.site_id || "");
  const s = (k: string) => (b[k] == null ? undefined : String(b[k]));
  try {
    switch (op.join("/")) {
      case "site/create": {
        const domain = String(b.domain || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
        if (!domain) return erro("domain");
        const nome = String(b.name || domain);
        const orgNome = String(b.org_name || `DDG · ${nome}`);
        const slug = `${slugify(orgNome)}-${Math.random().toString(36).slice(2, 6)}`;
        const { data: org, error: e1 } = await sb.from("organizations").insert({ name: orgNome, slug }).select("id").single();
        if (e1 || !org) return erro(`org: ${e1?.message}`);
        const { data: site, error: e2 } = await sb.from("sites").insert({ organization_id: org.id, domain, tenant_slug: slugify(domain).slice(0, 40), status: "active" }).select(SITE_CAMPOS).single();
        if (e2 || !site) return erro(`site: ${e2?.message}`);
        return ok({ site });
      }
      case "site/update": {
        if (!siteId) return erro("site_id");
        const permitidos = ["status", "blog_template", "vertical", "autopilot_enabled", "autopilot_posts_per_week", "domain"];
        const patch: Record<string, unknown> = {};
        for (const k of permitidos) if (k in b) patch[k] = b[k];
        const { error } = await sb.from("sites").update(patch).eq("id", siteId);
        if (error) return erro(error.message);
        return ok({ ok: true });
      }
      case "briefing/refine": {
        const raw = b.raw_answers as RawAnswers | undefined;
        if (!raw || typeof raw !== "object") return erro("raw_answers");
        return ok({ refined: await refineBriefing(raw) });
      }
      case "briefing/save": {
        // mesmo contrato do /api/briefing/save do app: raw_answers (12 perguntas) + refined_brief; 1 briefing por organização
        if (!siteId) return erro("site_id");
        const { data: site } = await sb.from("sites").select("organization_id").eq("id", siteId).maybeSingle();
        if (!site) return erro("site nao encontrado", 404);
        const raw = (b.raw_answers || {}) as RawAnswers;
        const refined = (b.refined_brief || null) as RefinedBrief | null;
        const status = (String(b.completion_status || "in_progress") as "in_progress" | "review" | "completed");
        const legacy: Record<string, unknown> = refined ? {
          business_description: refined.identity?.description ?? null, services: refined.positioning?.differentials ?? [], competitors: refined.market?.competitors ?? [],
          target_keywords: refined.seo?.primary_keywords ?? [], faq_questions: refined.visibility_goal?.target_questions ?? [],
          differentiator: refined.positioning?.unique_value || refined.positioning?.differentials?.[0] || null,
        } : {};
        const payload: Record<string, unknown> = { organization_id: site.organization_id, site_id: siteId, raw_answers: raw, refined_brief: refined, mode: "guided", completion_status: status, completed_at: status === "completed" ? new Date().toISOString() : null, ...legacy };
        const { data: ex } = await sb.from("briefings").select("id").eq("organization_id", site.organization_id).limit(1).maybeSingle();
        let id: string;
        if (ex) { const { error } = await sb.from("briefings").update(payload).eq("id", ex.id); if (error) return erro(error.message); id = ex.id; }
        else { const { data: cr, error } = await sb.from("briefings").insert(payload).select("id").single(); if (error) return erro(error.message); id = cr.id; }
        let embeddings: number | null = null;
        if (status === "completed") { try { embeddings = (await processBriefingEmbeddings(id)).inserted; } catch (e) { await sb.from("briefings").update({ embedding_status: "failed" }).eq("id", id); return ok({ id, embeddings: null, aviso: `briefing salvo, memória falhou: ${e instanceof Error ? e.message : e}` }); } }
        return ok({ id, embeddings });
      }
      case "post/generate": {
        if (!siteId) return erro("site_id");
        const topic = s("extra_notes")?.trim() ? [s("topic"), `Detalhes do cliente: ${s("extra_notes")!.trim()}`].filter(Boolean).join("\n\n") : s("topic");
        const { postId } = await enqueueGeneration({ siteId, type: (s("type") as "long_form" | "faq_page") || "long_form", topic, targetKeyword: s("target_keyword"), targetQuestion: s("target_question") });
        return ok({ post_id: postId, queued: true });
      }
      case "post/source-preview": {
        const url = s("url")?.trim(); if (!url) return erro("url");
        return ok(await extractFromUrl(url));
      }
      case "post/from-source": {
        if (!siteId) return erro("site_id");
        let titulo = "", texto = (s("raw_text") || "").trim(), urlFonte = "";
        if (s("url")?.trim() && texto.length < 200) { const ex = await extractFromUrl(s("url")!.trim()); if (!ex.ok) return erro(ex.error); titulo = ex.source.title; texto = ex.source.text; urlFonte = ex.source.sourceUrl; }
        if (texto.length < 120) return erro("Preciso de mais conteudo: cole um link com texto ou o texto da fonte.");
        const topic = s("angle")?.trim() || titulo || texto.slice(0, 80);
        const extraContext = [titulo ? `Título da fonte: ${titulo}` : "", urlFonte ? `Link da fonte: ${urlFonte}` : "", s("angle")?.trim() ? `Ângulo que o cliente quer: ${s("angle")!.trim()}` : "", "", texto].join("\n");
        const { postId } = await enqueueGeneration({ siteId, type: (s("type") as "long_form" | "faq_page") || "long_form", topic, targetKeyword: s("target_keyword")?.trim() || undefined, extraContext });
        return ok({ post_id: postId, queued: true });
      }
      case "post/approve": {
        const id = s("id"); if (!id) return erro("id");
        const { error } = await sb.from("posts").update({ status: "published", published_at: new Date().toISOString(), approval_method: "manual_dashboard" }).eq("id", id);
        if (error) return erro(error.message); return ok({ ok: true });
      }
      case "post/reject": {
        const id = s("id"); if (!id) return erro("id");
        const { error } = await sb.from("posts").update({ status: "archived", approval_method: "manual_dashboard" }).eq("id", id);
        if (error) return erro(error.message); return ok({ ok: true });
      }
      case "post/delete": {
        const id = s("id"); if (!id) return erro("id");
        const { data: p } = await sb.from("posts").select("status").eq("id", id).maybeSingle();
        if (p?.status === "published") return erro("Post publicado nao pode ser apagado; arquive.");
        const { error } = await sb.from("posts").delete().eq("id", id);
        if (error) return erro(error.message); return ok({ ok: true });
      }
      case "post/save": {
        const id = s("id"); if (!id) return erro("id");
        const patch: Record<string, unknown> = {};
        for (const k of ["title", "meta_description", "content_markdown", "target_keyword", "category_id", "scheduled_at"]) if (k in b) patch[k] = b[k];
        patch.updated_at = new Date().toISOString();
        const { error } = await sb.from("posts").update(patch).eq("id", id);
        if (error) return erro(error.message); return ok({ ok: true });
      }
      case "post/repurpose": {
        const id = s("id"); const f = s("format"); if (!id || !f) return erro("id e format");
        const r = f === "newsletter" ? await generateNewsletter(id) : f === "linkedin" ? await generateLinkedInPost(id) : f === "twitter" ? await generateTwitterThread(id)
          : f === "instagram" ? await generateInstagramCarousel(id) : f === "lead_magnet" ? await generateLeadMagnet(id) : f === "translate_en" ? await translatePost(id, "en") : f === "translate_es" ? await translatePost(id, "es") : null;
        if (!r) return erro("format invalido");
        return ok({ resultado: r });
      }
      case "keywords/refresh": {
        if (!siteId) return erro("site_id");
        const { data: site } = await sb.from("sites").select("organization_id").eq("id", siteId).maybeSingle();
        if (!site) return erro("site nao encontrado", 404);
        return ok(await refreshKeywordUniverse(site.organization_id, siteId));
      }
      case "autopilot": {
        if (!siteId) return erro("site_id");
        const ppw = Math.max(1, Math.min(14, Math.round(Number(b.posts_per_week || 3))));
        const { error } = await sb.from("sites").update({ autopilot_enabled: !!b.enabled, autopilot_posts_per_week: ppw }).eq("id", siteId);
        if (error) return erro(error.message); return ok({ ok: true });
      }
      case "visibility/run": {
        if (!siteId) return erro("site_id");
        return ok(await runVisibilityTracking(siteId));
      }
      case "metrics/sync": {
        if (!siteId) return erro("site_id");
        return ok(await syncSiteMetrics(siteId, Math.min(Number(b.days || 30), 365)));
      }
      case "audit": {
        if (!siteId) return erro("site_id");
        const { data: site } = await sb.from("sites").select("domain").eq("id", siteId).maybeSingle();
        if (!site) return erro("site nao encontrado", 404);
        const a = await auditSite(`https://${site.domain}`);
        await sb.from("sites").update({ audit_score: a.score, audit_data: a as unknown as Record<string, unknown>, audit_run_at: a.ran_at, stack_detected: a.checks.stack.detected, has_cloudflare: a.checks.cloudflare.detected }).eq("id", siteId);
        return ok({ audit: a });
      }
      case "categories/create": {
        if (!siteId) return erro("site_id");
        const name = (s("name") || "").trim(); if (!name) return erro("name");
        const base = slugify(name) || "categoria";
        for (let i = 0; i < 5; i++) {
          const slug = i === 0 ? base : `${base}-${i + 1}`;
          const { data, error } = await sb.from("blog_categories").insert({ site_id: siteId, name, slug, description: s("description") || null }).select("*").single();
          if (!error) return ok({ categoria: data });
          if (!/duplicate|unique/i.test(error.message)) return erro(error.message);
        }
        return erro("slug em conflito");
      }
      case "categories/update": {
        const id = s("id"); if (!id) return erro("id");
        const patch: Record<string, unknown> = {}; if (s("name")) patch.name = s("name")!.trim(); if ("description" in b) patch.description = s("description") || null;
        const { error } = await sb.from("blog_categories").update(patch).eq("id", id);
        if (error) return erro(error.message); return ok({ ok: true });
      }
      case "categories/delete": {
        const id = s("id"); if (!id) return erro("id");
        const { error } = await sb.from("blog_categories").delete().eq("id", id);
        if (error) return erro(error.message); return ok({ ok: true });
      }
      case "categories/suggest": {
        if (!siteId) return erro("site_id");
        const { data: site } = await sb.from("sites").select("organization_id").eq("id", siteId).maybeSingle();
        if (!site) return erro("site nao encontrado", 404);
        const { data: br } = await sb.from("briefings").select("refined_brief").eq("organization_id", site.organization_id).maybeSingle();
        if (!br?.refined_brief) return erro("Termine o briefing primeiro: a IA usa as informações dele pra sugerir.");
        const sugs = await suggestCategories(br.refined_brief as Record<string, unknown>);
        const { data: ex } = await sb.from("blog_categories").select("slug").eq("site_id", siteId);
        const slugs = new Set((ex ?? []).map((c: { slug: string }) => c.slug));
        const ins = sugs.filter((x) => !slugs.has(x.slug)).map((x, i) => ({ site_id: siteId, name: x.name, slug: x.slug, description: x.description || null, display_order: slugs.size + i, source: "ai_suggested" }));
        if (ins.length) { const { error } = await sb.from("blog_categories").insert(ins); if (error) return erro(error.message); }
        return ok({ criadas: ins.length });
      }
      case "import/wordpress": {
        if (!siteId) return erro("site_id");
        const src = s("source_url")?.trim(); if (!src) return erro("source_url");
        return ok({ resultado: await importWordPressBlog({ siteId, sourceUrl: src, limit: Math.min(Number(b.limit || 50), 200) }) });
      }
      case "domain/initiate": {
        if (!siteId) return erro("site_id");
        const { data: site } = await sb.from("sites").select("domain").eq("id", siteId).maybeSingle();
        if (!site?.domain) return erro("site sem dominio");
        const apex = String(site.domain).replace(/^www\./, ""); const blogHost = `blog.${apex}`; const cname = process.env.BLOG_CNAME_TARGET ?? "cname.conteudai.com.br";
        const added = await addProjectDomain(blogHost);
        if (!added.ok) { await sb.from("sites").update({ integration_state: "error" }).eq("id", siteId); return erro(added.error ?? "falha ao registrar subdominio"); }
        const { error } = await sb.from("sites").update({ subdomain: "blog", blog_host: blogHost, cname_target: cname, vercel_domain_added: true, cname_verified: false, integration_state: "cname_pending", integration_started_at: new Date().toISOString() }).eq("id", siteId);
        if (error) return erro(error.message);
        return ok({ blog_host: blogHost, cname_name: "blog", cname_target: cname });
      }
      case "domain/verify": {
        if (!siteId) return erro("site_id");
        const { data: site } = await sb.from("sites").select("blog_host").eq("id", siteId).maybeSingle();
        if (!site?.blog_host) return erro("conexao nao iniciada");
        const st = await getProjectDomainStatus(String(site.blog_host));
        if (!st.verified) { await sb.from("sites").update({ integration_state: "verifying" }).eq("id", siteId); return ok({ verified: false }); }
        await sb.from("sites").update({ cname_verified: true, cname_verified_at: new Date().toISOString(), integration_state: "active", integration_activated_at: new Date().toISOString(), status: "active", proxy_method: "subdomain" }).eq("id", siteId);
        return ok({ verified: true });
      }
      default: return erro(`operacao desconhecida: ${op.join("/")}`, 404);
    }
  } catch (e) { return erro(e instanceof Error ? e.message : String(e), 500); }
}
