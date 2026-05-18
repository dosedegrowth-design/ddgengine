import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ExternalLink, Sparkles, AlertTriangle } from "lucide-react";
import { getCurrentSite } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { PostEditor } from "./post-editor";
import { DeleteFailedPostButton } from "./failed-actions";
import { HeroImagePicker } from "./hero-image-picker";
import { StatusBadge } from "@/components/dashboard/status-badge";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { site, supabase, org } = await getCurrentSite();

  if (!site) redirect("/onboarding");

  const { data: post } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .eq("site_id", site.id)
    .maybeSingle();

  if (!post) notFound();

  return (
    <div className="container mx-auto max-w-4xl px-6 py-10 space-y-6">
      <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/posts"
            className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-ddg-muted hover:text-ddg-ink transition-colors mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar pra lista
          </Link>
          <h1 className="ddg-display text-2xl md:text-3xl text-ddg-ink leading-tight">
            {post.title ?? "Sem título"}
          </h1>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-full bg-ddg-stone text-ddg-muted">
              {post.type === "long_form" ? "Artigo" : "FAQ"}
            </span>
            <StatusBadge status={post.status} />
            {post.published_at && (
              <span className="text-xs text-ddg-muted">
                Publicado em {formatDate(post.published_at)}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {post.status === "published" && org.slug && post.slug && (
            <Link
              href={`/blog/${org.slug}/${post.slug}`}
              target="_blank"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-ddg-ink text-ddg-ink text-sm font-medium hover:bg-ddg-ink hover:text-ddg-paper transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> Ver no blog
            </Link>
          )}
          {post.status !== "failed" && (
            <Link
              href={`/posts/${id}/repurpose`}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-ddg-lime text-ddg-ink font-bold text-sm border-2 border-ddg-ink shadow-[3px_3px_0_var(--ddg-ink)] hover:shadow-[5px_5px_0_var(--ddg-ink)] hover:-translate-y-0.5 transition-all"
            >
              <Sparkles className="w-4 h-4" /> Reaproveitar
            </Link>
          )}
        </div>
      </header>

      {/* Aviso de falha + botão tentar de novo */}
      {post.status === "failed" && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm text-amber-900">
                A geração desse post falhou
              </div>
              <p className="text-sm text-amber-800 mt-1 leading-relaxed">
                Pode ter sido instabilidade momentânea da IA ou falta de
                informação no briefing. Tente gerar de novo — geralmente passa
                na segunda tentativa.
              </p>
            </div>
          </div>
          <DeleteFailedPostButton postId={id} />
        </div>
      )}

      {/* Hero image — gerada pela IA OU upload manual do cliente */}
      {post.status !== "failed" && (
        <HeroImagePicker
          postId={id}
          initialUrl={post.og_image_url ?? null}
          postTitle={post.title ?? null}
        />
      )}

      {/* Meta description (visível e útil) */}
      {post.meta_description && (
        <div className="rounded-2xl border-2 border-ddg-ink bg-ddg-paper p-5">
          <div className="ddg-bracket mb-2">META DESCRIPTION</div>
          <p className="text-sm text-ddg-ink leading-relaxed">
            {post.meta_description}
          </p>
          {post.slug && (
            <div className="mt-3 pt-3 border-t border-ddg-stone">
              <div className="text-[10px] font-mono uppercase tracking-widest text-ddg-muted mb-1">
                URL
              </div>
              <code className="text-xs text-ddg-ink break-all">
                /blog/{org.slug}/{post.slug}
              </code>
            </div>
          )}
        </div>
      )}

      {/* Editor inline + approve/reject (não renderiza se failed) */}
      {post.status !== "failed" && (
        <PostEditor
          postId={id}
          initialContent={post.content_markdown ?? ""}
          initialTitle={post.title ?? ""}
          initialMeta={post.meta_description ?? ""}
          status={post.status as string}
        />
      )}
    </div>
  );
}
