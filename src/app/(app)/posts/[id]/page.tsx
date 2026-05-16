import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ExternalLink, Eye } from "lucide-react";
import { getCurrentSite } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { renderMarkdown } from "@/lib/markdown";
import { formatDate } from "@/lib/utils";

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

  const html = post.content_markdown ? renderMarkdown(post.content_markdown) : "";

  return (
    <div className="container mx-auto max-w-4xl px-6 py-10 space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-3 mb-2">
            <Link href="/posts">
              <ArrowLeft className="w-4 h-4" /> Voltar pra lista
            </Link>
          </Button>
          <h1 className="text-3xl font-semibold tracking-tight">
            {post.title ?? "Sem título"}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline">
              {post.type === "long_form" ? "Artigo longo" : "FAQ"}
            </Badge>
            <Badge variant={post.status === "published" ? "success" : "secondary"}>
              {post.status}
            </Badge>
            {post.published_at && (
              <span className="text-xs text-muted-foreground">
                Publicado em {formatDate(post.published_at)}
              </span>
            )}
          </div>
        </div>
        {post.status === "published" && (
          <Button asChild variant="outline">
            <Link href={`/blog/${org.slug}/${post.slug}`} target="_blank">
              <ExternalLink className="w-4 h-4" /> Ver no blog
            </Link>
          </Button>
        )}
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Meta</CardTitle>
          <CardDescription>{post.meta_description ?? "—"}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Slug</div>
            <div className="font-mono text-xs truncate">{post.slug}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Tokens in</div>
            <div className="font-medium tabular-nums">{post.tokens_input?.toLocaleString() ?? "0"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Tokens out</div>
            <div className="font-medium tabular-nums">{post.tokens_output?.toLocaleString() ?? "0"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Custo</div>
            <div className="font-medium tabular-nums">US$ {Number(post.cost_usd ?? 0).toFixed(4)}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Preview do conteúdo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <article
            className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:tracking-tight"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
