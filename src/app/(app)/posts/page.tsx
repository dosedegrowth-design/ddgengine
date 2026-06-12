/**
 * Posts — lista de conteúdo gerado, com identidade DDG
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, FileText, Sparkles } from "lucide-react";
import { getCurrentSite } from "@/lib/auth";
import { GeneratePostButton } from "@/components/dashboard/generate-post-button";
import { SuggestionsBar } from "@/components/dashboard/suggestions-bar";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PostListItem } from "@/components/dashboard/post-list-item";
import { suggestTopics } from "@/lib/briefing/suggest-topics";

const TYPE_LABEL: Record<string, string> = {
  long_form: "Artigo",
  faq_page: "FAQ",
};

export default async function PostsPage() {
  const { site, supabase, org } = await getCurrentSite();

  if (!site) redirect("/onboarding");

  const { data: briefing } = await supabase
    .from("briefings")
    .select("id, completion_status, embedding_status")
    .eq("site_id", site.id)
    .maybeSingle();

  const briefingReady =
    briefing?.embedding_status === "done" ||
    briefing?.completion_status === "completed";

  const { data: posts } = await supabase
    .from("posts")
    .select("id, slug, title, type, status, created_at, published_at, og_image_url")
    .eq("site_id", site.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Sugestões SEMPRE visíveis no topo (se briefing completo) — filtradas
  // pra não repetir tópicos já gerados / arquivados.
  const suggestions = briefingReady
    ? await suggestTopics(org.id, site.id)
    : [];

  return (
    <div>
      <PageHeader
        bracket="CONTEÚDO"
        title="Posts"
        subtitle={
          <span>
            Gerados pela engine pra{" "}
            <strong className="text-ddg-ink">{site.domain ?? "seu site"}</strong>
          </span>
        }
        actions={
          briefingReady ? (
            <GeneratePostButton siteId={site.id} />
          ) : (
            <Link
              href="/briefing"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-ddg-lime text-ddg-ink font-bold text-sm border-2 border-ddg-ink shadow-[3px_3px_0_var(--ddg-ink)] hover:shadow-[5px_5px_0_var(--ddg-ink)] hover:-translate-y-0.5 transition-all"
            >
              Completar briefing
              <ArrowRight className="w-4 h-4" />
            </Link>
          )
        }
      />

      <div className="container mx-auto max-w-7xl px-6 py-8 space-y-6">
        {/* Sugestões SEMPRE no topo (quando briefing pronto e há ideias filtradas) */}
        {briefingReady && suggestions.length > 0 && (
          <SuggestionsBar suggestions={suggestions} />
        )}

        {!briefingReady && (
          <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-amber-700 shrink-0" />
            <div className="text-sm flex-1">
              <strong className="text-amber-900">Termine o briefing</strong>
              <span className="text-amber-800">
                {" "}— a IA precisa aprender sua voz antes de gerar posts.
              </span>
            </div>
            <Link
              href="/briefing"
              className="text-xs font-mono uppercase tracking-widest text-amber-900 hover:underline"
            >
              Ir pro briefing →
            </Link>
          </div>
        )}

        {!posts || posts.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nenhum post ainda"
            description={
              briefingReady
                ? 'Clica em "Gerar post" no topo pra criar o primeiro conteúdo.'
                : "Termine o briefing primeiro e a engine começa a gerar."
            }
            cta={
              !briefingReady
                ? { label: "Completar briefing", href: "/briefing" }
                : undefined
            }
          />
        ) : (
          <ul className="space-y-2">
            {posts.map((p) => (
              <li key={p.id}>
                <PostListItem
                  id={p.id}
                  slug={p.slug}
                  title={p.title}
                  typeLabel={TYPE_LABEL[p.type] ?? p.type}
                  status={p.status}
                  createdAt={p.created_at}
                  publishedAt={p.published_at}
                  ogImageUrl={p.og_image_url}
                  orgSlug={org.slug}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
