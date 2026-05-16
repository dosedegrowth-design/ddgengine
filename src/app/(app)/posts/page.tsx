import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, FileText, Plus, Sparkles } from "lucide-react";
import { getCurrentSite } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GeneratePostButton } from "@/components/dashboard/generate-post-button";
import { formatRelativeTime } from "@/lib/utils";

const STATUS_LABEL: Record<string, { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" | "outline" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  generating: { label: "Gerando...", variant: "warning" },
  in_review: { label: "Aguardando aprovação", variant: "warning" },
  approved: { label: "Aprovado", variant: "default" },
  scheduled: { label: "Agendado", variant: "default" },
  published: { label: "Publicado", variant: "success" },
  failed: { label: "Falhou", variant: "destructive" },
  archived: { label: "Arquivado", variant: "outline" },
};

const TYPE_LABEL: Record<string, string> = {
  long_form: "Artigo longo",
  faq_page: "FAQ Page",
};

export default async function PostsPage() {
  const { site, supabase, org } = await getCurrentSite();

  if (!site) redirect("/onboarding");

  const { data: briefing } = await supabase
    .from("briefings")
    .select("id, completion_percent, embedding_status")
    .eq("site_id", site.id)
    .maybeSingle();

  const briefingReady = briefing?.embedding_status === "done";

  const { data: posts } = await supabase
    .from("posts")
    .select("id, slug, title, type, status, created_at, published_at, cost_usd")
    .eq("site_id", site.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="container mx-auto max-w-6xl px-6 py-10 space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Conteúdo</h1>
          <p className="text-muted-foreground mt-1">
            Posts gerados pelo DDG Engine pra {site.domain}
          </p>
        </div>
        {briefingReady ? (
          <GeneratePostButton siteId={site.id} />
        ) : (
          <Button asChild>
            <Link href="/briefing">
              Completar briefing primeiro <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        )}
      </header>

      {!briefingReady && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="text-sm">
              <span className="font-medium">Termine o briefing</span> pra IA aprender sua voz antes de gerar posts.
            </div>
            <Button asChild size="sm" variant="outline" className="ml-auto">
              <Link href="/briefing">Ir pro briefing</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!posts || posts.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="text-center py-12">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-muted-foreground" />
            </div>
            <CardTitle>Nenhum post ainda</CardTitle>
            <CardDescription className="max-w-sm mx-auto">
              {briefingReady
                ? "Clique em \"Gerar post\" pra criar seu primeiro conteúdo."
                : "Termine o briefing primeiro e a IA escreve por você."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-2">
          {posts.map((p) => {
            const status = STATUS_LABEL[p.status] ?? { label: p.status, variant: "default" as const };
            return (
              <Link
                key={p.id}
                href={`/posts/${p.id}`}
                className="block p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {TYPE_LABEL[p.type] ?? p.type}
                      </Badge>
                      <Badge variant={status.variant} className="text-xs">
                        {status.label}
                      </Badge>
                    </div>
                    <div className="font-medium truncate">
                      {p.title ?? "Sem título"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {p.status === "published" && p.published_at
                        ? `Publicado ${formatRelativeTime(p.published_at)}`
                        : `Criado ${formatRelativeTime(p.created_at)}`}
                      {p.cost_usd != null ? ` · custo US$ ${Number(p.cost_usd).toFixed(4)}` : ""}
                    </div>
                  </div>
                  {p.status === "published" && (
                    <Button asChild variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>
                      <Link href={`/blog/${org.slug}/${p.slug}`} target="_blank">
                        Ver post
                      </Link>
                    </Button>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
