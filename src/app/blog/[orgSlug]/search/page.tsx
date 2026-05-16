import Link from "next/link";
import { notFound } from "next/navigation";
import { Search } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { orgSlug } = await params;
  return { title: `Busca · ${orgSlug}` };
}

export default async function SearchPage({ params, searchParams }: PageProps) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const query = (sp.q ?? "").trim();

  const supabase = createServiceClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", orgSlug)
    .maybeSingle();

  if (!org) notFound();

  let results: any[] = [];
  if (query.length >= 2) {
    const { data } = await supabase.rpc("ddg_engine_search_posts", {
      p_org_slug: orgSlug,
      p_query: query,
      p_limit: 30,
    });
    results = data ?? [];
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-6 py-16">
        <Link
          href={`/blog/${org.slug}`}
          className="text-sm text-muted-foreground hover:text-foreground mb-8 inline-block"
        >
          ← Voltar pro blog de {org.name}
        </Link>

        <header className="mb-8">
          <h1 className="text-4xl font-semibold tracking-tight mb-4">
            Busca no blog
          </h1>
          <form method="GET" action={`/blog/${orgSlug}/search`} className="flex gap-2 max-w-xl">
            <Input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Digite o que está procurando..."
              autoFocus
            />
            <Button type="submit">
              <Search className="w-4 h-4" />
            </Button>
          </form>
        </header>

        {query && query.length < 2 && (
          <p className="text-muted-foreground">Digite ao menos 2 caracteres.</p>
        )}

        {query.length >= 2 && results.length === 0 && (
          <p className="text-muted-foreground">
            Nenhum resultado para &quot;{query}&quot;. Tente outras palavras-chave.
          </p>
        )}

        {results.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              {results.length} resultado{results.length > 1 ? "s" : ""} para &quot;{query}&quot;
            </p>
            <div className="space-y-3">
              {results.map((r) => (
                <Link
                  key={r.id}
                  href={`/blog/${org.slug}/${r.slug}`}
                  className="block p-5 rounded-lg border hover:shadow-md transition-all"
                >
                  <div className="text-xs text-muted-foreground mb-1">
                    {r.type === "long_form" ? "Artigo" : "FAQ"}
                    {r.published_at && ` · ${formatDate(r.published_at)}`}
                  </div>
                  <h2 className="font-semibold text-lg mb-1">{r.title}</h2>
                  {r.meta_description && (
                    <p className="text-sm text-muted-foreground">
                      {r.meta_description}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
