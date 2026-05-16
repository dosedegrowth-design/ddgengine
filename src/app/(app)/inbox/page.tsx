import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Check, Inbox, X } from "lucide-react";
import { getCurrentSite } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/utils";

export default async function InboxPage() {
  const { site, supabase } = await getCurrentSite();
  if (!site) redirect("/onboarding");

  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, type, status, created_at, meta_description, target_keyword, target_question")
    .eq("site_id", site.id)
    .eq("status", "in_review")
    .order("created_at", { ascending: false });

  return (
    <div className="container mx-auto max-w-4xl px-6 py-10 space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
          <Inbox className="w-7 h-7" />
          Inbox de aprovações
        </h1>
        <p className="text-muted-foreground mt-1">
          Posts aguardando sua aprovação antes de publicar
        </p>
      </header>

      {!posts || posts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center space-y-3">
            <Check className="w-10 h-10 mx-auto text-emerald-600 dark:text-emerald-400" />
            <div>
              <div className="font-medium">Tudo aprovado!</div>
              <p className="text-sm text-muted-foreground mt-1">
                Nenhum post pendente. Próximas gerações vão aparecer aqui.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((p: any) => (
            <Card key={p.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {p.type === "long_form" ? "Artigo" : "FAQ"}
                      </Badge>
                      <Badge variant="warning" className="text-xs">Aguardando</Badge>
                    </div>
                    <CardTitle className="text-xl">{p.title}</CardTitle>
                    {p.meta_description && (
                      <CardDescription className="mt-2">{p.meta_description}</CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground">
                    Criado {formatRelativeTime(p.created_at)}
                    {p.target_keyword && ` · keyword: ${p.target_keyword}`}
                  </div>
                  <Button asChild>
                    <Link href={`/posts/${p.id}`}>
                      Revisar <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
