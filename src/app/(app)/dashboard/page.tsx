import Link from "next/link";
import { ArrowRight, BarChart3, FileText, Sparkles, Zap } from "lucide-react";
import { getCurrentSite } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const { site, supabase, org } = await getCurrentSite();

  if (!site) {
    return (
      <div className="container mx-auto max-w-4xl px-6 py-10">
        <Card className="border-dashed">
          <CardHeader>
            <Badge variant="secondary" className="w-fit mb-2">
              Setup pendente
            </Badge>
            <CardTitle>Bem-vindo ao DDG Engine</CardTitle>
            <CardDescription>
              Você ainda não conectou seu site. Vamos começar?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/onboarding">
                Começar setup <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Buscar contadores
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

  return (
    <div className="container mx-auto max-w-6xl px-6 py-10 space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Visão geral</h1>
          <p className="text-muted-foreground mt-1">
            {site.domain} · Status: <span className="capitalize">{site.status}</span>
          </p>
        </div>
        <Button asChild>
          <Link href="/posts">
            Ver conteúdo <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </header>

      {/* KPIs */}
      <div className="grid md:grid-cols-4 gap-4">
        <KpiCard
          icon={FileText}
          label="Posts publicados"
          value={publishedPosts ?? 0}
          hint="últimos 30 dias"
        />
        <KpiCard
          icon={Zap}
          label="Em produção"
          value={draftPosts ?? 0}
          hint="rascunhos + gerando"
        />
        <KpiCard
          icon={BarChart3}
          label="Total de posts"
          value={totalPosts ?? 0}
          hint="todos os tempos"
        />
        <KpiCard
          icon={Sparkles}
          label="Citações IA"
          value="—"
          hint="ative no Pro+"
        />
      </div>

      {/* Próximos passos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Próximos passos</CardTitle>
          <CardDescription>Itens recomendados pra otimizar seu setup</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ChecklistItem
            done={site.status === "active"}
            label="Conectar site e verificar"
            href="/onboarding"
          />
          <ChecklistItem
            done={site.gsc_connected_at !== null}
            label="Conectar Google Search Console"
            href="/settings/integrations"
          />
          <ChecklistItem
            done={site.ga4_connected_at !== null}
            label="Conectar Google Analytics 4"
            href="/settings/integrations"
          />
          <ChecklistItem
            done={(publishedPosts ?? 0) > 0}
            label="Publicar primeiro post"
            href="/posts"
          />
        </CardContent>
      </Card>

      {/* Trial banner */}
      {org.plan === "trial" && (
        <Card className="border-foreground/30 bg-muted/30">
          <CardContent className="p-6 flex items-center justify-between gap-4">
            <div>
              <div className="font-medium">Você está no período de teste</div>
              <div className="text-sm text-muted-foreground">
                Trial expira em {new Date(org.trial_ends_at).toLocaleDateString("pt-BR")}
              </div>
            </div>
            <Button asChild>
              <Link href="/settings/billing">Escolher plano</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  hint: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardDescription className="text-xs uppercase tracking-wide">
            {label}
          </CardDescription>
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      </CardContent>
    </Card>
  );
}

function ChecklistItem({
  done,
  label,
  href,
}: {
  done: boolean;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-md hover:bg-accent/40 transition-colors"
    >
      <div
        className={
          done
            ? "w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center"
            : "w-5 h-5 rounded-full border-2 border-muted-foreground/30"
        }
      >
        {done && (
          <svg className="w-3 h-3 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className={done ? "text-muted-foreground line-through" : ""}>{label}</span>
      <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground" />
    </Link>
  );
}
