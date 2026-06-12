/**
 * Palavras-chave — pesquisa de keyword com volume/concorrência (Google
 * Keyword Planner). O cliente descobre o que as pessoas buscam no Google e
 * gera um post otimizado pra aquela palavra com 1 clique.
 */
import { redirect } from "next/navigation";
import { Search, TrendingUp, Sparkles } from "lucide-react";
import { getCurrentSite } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/page-header";
import { KeywordResearch } from "@/components/dashboard/keyword-research";

export default async function PalavrasChavePage() {
  const { site, supabase } = await getCurrentSite();
  if (!site) redirect("/onboarding");

  // Prefill com a 1ª palavra-chave do briefing (se houver)
  const { data: briefing } = await supabase
    .from("briefings")
    .select("target_keywords")
    .eq("site_id", site.id)
    .maybeSingle();

  const initialSeed = (briefing?.target_keywords as string[] | null)?.[0] ?? "";

  return (
    <div>
      <PageHeader
        bracket="CONTEÚDO"
        title="Palavras-chave"
        subtitle={
          <span>
            Descubra o que as pessoas buscam no Google e gere o post na hora
          </span>
        }
      />

      <div className="container mx-auto max-w-4xl px-6 py-8 space-y-6">
        <KeywordResearch initialSeed={initialSeed} />

        <div className="grid sm:grid-cols-3 gap-3">
          <HowCard
            icon={Search}
            title="Pesquise um tema"
            text="Digite uma palavra do seu negócio (ex: ração hipoalergênica)."
          />
          <HowCard
            icon={TrendingUp}
            title="Veja o volume real"
            text="Buscas por mês no Google, concorrência e tendência — dado oficial."
          />
          <HowCard
            icon={Sparkles}
            title="Gere o post"
            text="Escolhe a palavra com bom volume e a engine escreve otimizada pra ela."
          />
        </div>
      </div>
    </div>
  );
}

function HowCard({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border-2 border-ddg-stone bg-ddg-paper p-4">
      <div className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md border-2 border-ddg-ink bg-ddg-lime/20 mb-2">
        <Icon className="w-3.5 h-3.5 text-ddg-ink" />
      </div>
      <div className="font-bold text-sm text-ddg-ink mb-1">{title}</div>
      <p className="text-xs text-ddg-muted">{text}</p>
    </div>
  );
}
