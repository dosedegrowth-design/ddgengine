import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ExternalLink, Sparkles } from "lucide-react";
import { getCurrentSite } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { PostEditor } from "./post-editor";

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

  // Pega gates do post
  const { data: gates } = await supabase
    .from("quality_gate_runs")
    .select("gate_name, passed, score, threshold, details")
    .eq("post_id", id);

  return (
    <div className="container mx-auto max-w-4xl px-6 py-10 space-y-6">
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
            <Badge
              variant={
                post.status === "published"
                  ? "success"
                  : post.status === "in_review"
                  ? "warning"
                  : post.status === "failed"
                  ? "destructive"
                  : "secondary"
              }
            >
              {post.status}
            </Badge>
            {post.published_at && (
              <span className="text-xs text-muted-foreground">
                Publicado em {formatDate(post.published_at)}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {post.status === "published" && (
            <Button asChild variant="outline">
              <Link href={`/blog/${org.slug}/${post.slug}`} target="_blank">
                <ExternalLink className="w-4 h-4" /> Ver no blog
              </Link>
            </Button>
          )}
          <Button asChild>
            <Link href={`/posts/${id}/repurpose`}>
              <Sparkles className="w-4 h-4" /> Repurpose
            </Link>
          </Button>
        </div>
      </header>

      {/* Meta */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Meta</CardTitle>
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

      {/* Quality gates */}
      {gates && gates.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quality gates</CardTitle>
            <CardDescription>
              {gates.filter((g) => g.passed).length} de {gates.length} passes
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            {gates.map((g: any) => (
              <div
                key={g.gate_name}
                className={
                  g.passed
                    ? "border-l-2 border-emerald-500 pl-3 py-1"
                    : "border-l-2 border-amber-500 pl-3 py-1"
                }
              >
                <div className="text-xs text-muted-foreground capitalize">
                  {g.gate_name.replace(/_/g, " ")}
                </div>
                <div className="font-medium tabular-nums">
                  {typeof g.score === "number" ? g.score.toFixed(g.score > 1 ? 0 : 2) : "—"}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Editor inline + approve/reject */}
      <PostEditor
        postId={id}
        initialContent={post.content_markdown ?? ""}
        initialTitle={post.title ?? ""}
        initialMeta={post.meta_description ?? ""}
        status={post.status as string}
      />
    </div>
  );
}
