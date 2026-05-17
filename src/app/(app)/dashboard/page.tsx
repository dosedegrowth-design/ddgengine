/**
 * Dashboard — visão geral do painel com identidade DDG
 */
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BarChart3, FileText, Sparkles, Zap, MessageCircle, Globe } from "lucide-react";
import { getCurrentSite } from "@/lib/auth";
import { formatRelativeTime } from "@/lib/utils";

export default async function DashboardPage() {
  const { site, supabase, org } = await getCurrentSite();

  // Sem site = redireciona pro onboarding
  if (!site) {
    return (
      <div className="container mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-2xl border-2 border-ddg-ink bg-ddg-paper p-8 md:p-10 text-center">
          <div className="ddg-bracket text-ddg-lime-deep mb-4 inline-block">
            SETUP PENDENTE
          </div>
          <h1 className="ddg-display text-3xl md:text-4xl mb-3">
            Bem-vindo ao DDG Engine
          </h1>
          <p className="text-base text-ddg-muted mb-7 max-w-xl mx-auto leading-relaxed">
            Você ainda não conectou seu site nem preencheu o briefing.
            Em 7 minutos, sua engine vai estar entendendo seu negócio.
          </p>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-ddg-lime text-ddg-ink font-bold text-sm border-2 border-ddg-ink shadow-[3px_3px_0_var(--ddg-ink)] hover:shadow-[5px_5px_0_var(--ddg-ink)] hover:-translate-y-0.5 transition-all"
          >
            Começar setup
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // ===== Carrega dados =====
  const { count: totalPosts } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("site_id", site.id);

  const { count: publishedPosts } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("site_id", site.id)
    .eq("status", "published");

  const { count: draftPosts } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("site_id", site.id)
    .in("status", ["draft", "generating", "in_review"]);

  const { count: pendingReview } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("site_id", site.id)
    .eq("status", "in_review");

  const { data: recentPosts } = await supabase
    .from("posts")
    .select("id, title, type, status, created_at, published_at")
    .eq("site_id", site.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: latestVisibility } = await supabase
    .from("ai_visibility_runs")
    .select("total_citations, citations_by_llm, share_of_voice, completed_at")
    .eq("site_id", site.id)
    .eq("status", "completed")
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  const brandSov = (((latestVisibility?.share_of_voice as Record<string, number>) ?? {}).brand ?? 0);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b-2 border-ddg-ink bg-ddg-paper">
        <div className="container mx-auto max-w-7xl px-6 py-6 md:py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="ddg-bracket mb-2">DASHBOARD</div>
            <h1 className="ddg-display text-3xl md:text-4xl">
              Visão geral
            </h1>
            <div className="flex items-center gap-3 mt-2 text-xs font-mono uppercase tracking-widest text-ddg-muted">
              <span className="inline-flex items-center gap-1.5">
                <Globe className="w-3 h-3" />
                {site.domain ?? "site.com.br"}
              </span>
              <span className="text-ddg-lime-deep">●</span>
              <span className="capitalize">Status: {site.status ?? "ativo"}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(pendingReview ?? 0) > 0 && (
              <Link
                href="/inbox"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-ddg-lime text-ddg-ink font-bold text-sm border-2 border-ddg-ink shadow-[3px_3px_0_var(--ddg-ink)] hover:shadow-[5px_5px_0_var(--ddg-ink)] hover:-translate-y-0.5 transition-all"
              >
                Aprovar {pendingReview} {pendingReview === 1 ? "post" : "posts"}
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <Link
              href="/posts"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-ddg-ink text-ddg-ink font-medium text-sm hover:bg-ddg-ink hover:text-ddg-paper transition-colors"
            >
              Ver posts
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-7xl px-6 py-8 md:py-10 space-y-8">
        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <KpiCard
            icon={FileText}
            label="Publicados"
            value={publishedPosts ?? 0}
            hint="todos os tempos"
            href="/posts?status=published"
          />
          <KpiCard
            icon={Zap}
            label="Em produção"
            value={draftPosts ?? 0}
            hint="gerando + aguardando"
            href="/posts?status=draft"
            highlight={(draftPosts ?? 0) > 0}
          />
          <KpiCard
            icon={BarChart3}
            label="Total"
            value={totalPosts ?? 0}
            hint="incluindo arquivados"
            href="/posts"
          />
          <KpiCard
            icon={Sparkles}
            label="Aparições em IA"
            value={`${(brandSov * 100).toFixed(0)}%`}
            hint={
              latestVisibility
                ? `${latestVisibility.total_citations} citações esta semana`
                : "Configurar rastreamento"
            }
            href="/visibility"
            accent
          />
        </section>

        {/* Grid: Posts recentes + Visibility */}
        <section className="grid lg:grid-cols-2 gap-4 md:gap-5">
          {/* Posts recentes */}
          <div className="rounded-2xl border-2 border-ddg-ink bg-ddg-paper p-5 md:p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="ddg-bracket mb-1">POSTS RECENTES</div>
                <h2 className="text-lg font-black">Últimos publicados</h2>
              </div>
              <Link
                href="/posts"
                className="text-xs font-mono uppercase tracking-widest text-ddg-muted hover:text-ddg-lime-deep transition-colors"
              >
                Ver todos →
              </Link>
            </div>

            {!recentPosts || recentPosts.length === 0 ? (
              <div className="text-center py-8 text-sm text-ddg-muted">
                <FileText className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p>Nenhum post ainda.</p>
                <p className="text-xs mt-1">A engine gera assim que o briefing tá completo.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {recentPosts.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/posts/${p.id}`}
                      className="block p-3 rounded-lg border-2 border-transparent hover:border-ddg-lime/30 hover:bg-ddg-cream transition-all group"
                    >
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-ddg-stone text-ddg-muted">
                          {p.type === "long_form" ? "Artigo" : "FAQ"}
                        </span>
                        <StatusBadge status={p.status} />
                      </div>
                      <div className="text-sm font-bold text-ddg-ink truncate group-hover:text-ddg-lime-deep transition-colors">
                        {p.title ?? "Sem título"}
                      </div>
                      <div className="text-xs text-ddg-muted mt-1">
                        {formatRelativeTime(p.created_at)}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Visibility */}
          <div className="rounded-2xl border-2 border-ddg-ink bg-ddg-ink text-ddg-paper p-5 md:p-6 shadow-[6px_6px_0_var(--ddg-lime)] relative overflow-hidden">
            {/* Glow lime sutil */}
            <div
              className="absolute -top-20 -right-20 w-60 h-60 rounded-full pointer-events-none opacity-30"
              style={{
                background:
                  "radial-gradient(circle, rgba(200,255,61,0.4) 0%, transparent 60%)",
              }}
              aria-hidden
            />

            <div className="relative flex items-center justify-between mb-5">
              <div>
                <div className="ddg-bracket text-ddg-lime mb-1">AI VISIBILITY</div>
                <h2 className="text-lg font-black text-ddg-paper">Sua marca nas IAs</h2>
              </div>
              <Link
                href="/visibility"
                className="text-xs font-mono uppercase tracking-widest text-ddg-paper/40 hover:text-ddg-lime transition-colors"
              >
                Detalhes →
              </Link>
            </div>

            {!latestVisibility ? (
              <div className="relative text-center py-6 text-sm text-ddg-paper/60">
                <Sparkles className="w-8 h-8 mx-auto mb-3 text-ddg-lime opacity-50" />
                <p className="mb-4">Ainda não rodamos nenhuma análise.</p>
                <Link
                  href="/visibility"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ddg-lime text-ddg-ink font-bold text-xs border-2 border-ddg-ink shadow-[2px_2px_0_var(--ddg-ink)] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_var(--ddg-ink)] transition-all"
                >
                  Rodar primeira análise
                </Link>
              </div>
            ) : (
              <div className="relative space-y-4">
                <div className="flex items-baseline gap-2">
                  <span
                    className="text-5xl md:text-6xl font-black tabular-nums text-ddg-paper drop-shadow-[0_0_24px_rgba(200,255,61,0.35)]"
                    style={{ fontFamily: 'ui-serif, "Times New Roman", serif' }}
                  >
                    {latestVisibility.total_citations}
                  </span>
                  <span className="text-sm font-mono uppercase tracking-widest text-ddg-paper/60">
                    citações
                  </span>
                </div>
                <div className="text-xs font-mono uppercase tracking-widest text-ddg-paper/40">
                  Última semana ·{" "}
                  {latestVisibility.completed_at &&
                    formatRelativeTime(latestVisibility.completed_at)}
                </div>

                <div className="space-y-1.5 pt-2 border-t border-ddg-paper/10">
                  {Object.entries(
                    (latestVisibility.citations_by_llm as Record<string, number>) ?? {}
                  )
                    .slice(0, 4)
                    .map(([llm, count]) => (
                      <div
                        key={llm}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="capitalize text-ddg-paper/80 font-medium">
                          {llm}
                        </span>
                        <span className="font-bold tabular-nums text-ddg-lime">
                          {Number(count)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Quick actions */}
        <section className="grid sm:grid-cols-3 gap-3 md:gap-4">
          <ActionCard
            icon={MessageCircle}
            label="WhatsApp"
            title="Aprovar posts no Zap"
            href="/settings/notifications"
          />
          <ActionCard
            icon={Sparkles}
            label="Briefing"
            title="Editar ficha da marca"
            href="/briefing"
          />
          <ActionCard
            icon={Globe}
            label="Integração"
            title="Status do seu site"
            href="/settings/site"
          />
        </section>

        {/* Trial banner */}
        {org.plan === "trial" && (
          <section className="rounded-2xl border-2 border-ddg-lime bg-ddg-lime/10 p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="ddg-bracket text-ddg-lime-deep mb-1">TRIAL ATIVO</div>
              <div className="text-base font-bold text-ddg-ink">
                Você está no período de teste
              </div>
              {org.trial_ends_at && (
                <div className="text-sm text-ddg-muted mt-1">
                  Expira em{" "}
                  <strong className="text-ddg-ink">
                    {new Date(org.trial_ends_at).toLocaleDateString("pt-BR")}
                  </strong>
                </div>
              )}
            </div>
            <Link
              href="/settings/billing"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-ddg-ink text-ddg-paper font-bold text-sm hover:bg-ddg-graphite transition-colors"
            >
              Escolher plano
              <ArrowRight className="w-4 h-4" />
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}

// ===== Components =====

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  href,
  highlight = false,
  accent = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  hint: string;
  href: string;
  highlight?: boolean;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-xl border-2 p-4 md:p-5 transition-all hover:-translate-y-0.5 ${
        accent
          ? "border-ddg-ink bg-ddg-ink text-ddg-paper hover:shadow-[4px_4px_0_var(--ddg-lime)]"
          : highlight
          ? "border-ddg-lime bg-ddg-lime/10 hover:shadow-[4px_4px_0_var(--ddg-ink)]"
          : "border-ddg-ink bg-ddg-paper hover:shadow-[4px_4px_0_var(--ddg-ink)]"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={`ddg-bracket ${accent ? "text-ddg-lime" : ""}`}
        >
          {label}
        </div>
        <Icon
          className={`w-4 h-4 ${
            accent ? "text-ddg-lime" : highlight ? "text-ddg-lime-deep" : "text-ddg-muted"
          }`}
        />
      </div>
      <div
        className={`text-3xl md:text-4xl font-black tabular-nums leading-none ${
          accent ? "text-ddg-paper" : "text-ddg-ink"
        }`}
      >
        {value}
      </div>
      <div
        className={`text-[10px] font-mono uppercase tracking-widest mt-2 ${
          accent ? "text-ddg-paper/60" : "text-ddg-muted"
        }`}
      >
        {hint}
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; class: string }> = {
    published: { label: "Publicado", class: "bg-ddg-lime/20 text-ddg-lime-deep border-ddg-lime/40" },
    in_review: { label: "Revisão", class: "bg-amber-100 text-amber-900 border-amber-300" },
    generating: { label: "Gerando", class: "bg-blue-100 text-blue-900 border-blue-300" },
    draft: { label: "Rascunho", class: "bg-ddg-stone text-ddg-muted border-ddg-stone" },
    archived: { label: "Arquivado", class: "bg-ddg-stone text-ddg-muted border-ddg-stone" },
  };
  const cfg = map[status] ?? map.draft;
  return (
    <span
      className={`text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded-full border ${cfg.class}`}
    >
      {cfg.label}
    </span>
  );
}

function ActionCard({
  icon: Icon,
  label,
  title,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  title: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border-2 border-ddg-ink bg-ddg-paper p-4 hover:bg-ddg-cream hover:-translate-y-0.5 hover:shadow-[3px_3px_0_var(--ddg-lime)] transition-all group"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="ddg-bracket">{label}</div>
        <ArrowUpRight className="w-3.5 h-3.5 text-ddg-muted group-hover:text-ddg-lime-deep transition-colors" />
      </div>
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-ddg-lime-deep" />
        <span className="text-sm font-bold text-ddg-ink">{title}</span>
      </div>
    </Link>
  );
}
