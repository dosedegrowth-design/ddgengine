/**
 * Palavras-chave — pesquisa de keyword com volume/concorrência (Google
 * Keyword Planner). O cliente descobre o que as pessoas buscam no Google e
 * gera um post otimizado pra aquela palavra com 1 clique.
 */
import { redirect } from "next/navigation";
import { Search, TrendingUp, Sparkles, CheckCircle2, AlertTriangle, Plug } from "lucide-react";
import { getCurrentSite } from "@/lib/auth";
import { isAdminEmail } from "@/lib/auth/admin";
import { hasAppCredentials, getRefreshToken } from "@/lib/seo/keyword-research";
import { PageHeader } from "@/components/dashboard/page-header";
import { KeywordResearch } from "@/components/dashboard/keyword-research";

export default async function PalavrasChavePage({
  searchParams,
}: {
  searchParams: Promise<{ gads_connected?: string; gads_error?: string }>;
}) {
  const { site, supabase, user } = await getCurrentSite();
  if (!site) redirect("/onboarding");

  const sp = await searchParams;
  const isAdmin = isAdminEmail(user?.email);
  const connected = Boolean(await getRefreshToken());
  const appCreds = hasAppCredentials();

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
        {/* Feedback do OAuth (admin) */}
        {sp.gads_connected && (
          <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 flex items-center gap-3 text-sm text-emerald-900">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span><strong>Google conectado!</strong> A pesquisa de palavra-chave já está ativa pra todos os clientes.</span>
          </div>
        )}
        {sp.gads_error && (
          <div className="rounded-xl border-2 border-red-300 bg-red-50 p-4 flex items-center gap-3 text-sm text-red-900">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <span>Falha ao conectar o Google: <code className="text-xs">{sp.gads_error}</code>. Confira se a URL de redirect está cadastrada no cliente OAuth.</span>
          </div>
        )}

        {/* Bloco de conexão — só admin DDG */}
        {isAdmin && !connected && (
          <div className="rounded-2xl border-2 border-ddg-ink bg-ddg-cream/40 p-5">
            <div className="flex items-start gap-3">
              <div className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg border-2 border-ddg-ink bg-ddg-lime/20">
                <Plug className="w-4 h-4 text-ddg-ink" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-ddg-ink">Conectar o Google (admin · 1× pra sempre)</div>
                <p className="text-xs text-ddg-muted mt-1">
                  {appCreds
                    ? "Autoriza o Keyword Planner uma única vez. O token fica no nosso banco e vale pra todos os clientes — sem repetir por cliente."
                    : "Faltam as credenciais de app nas envs da Vercel (client id/secret, dev token, MCC)."}
                </p>
                {appCreds && (
                  <a
                    href="/api/google-ads/connect"
                    className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-lg bg-ddg-lime text-ddg-ink font-bold text-sm border-2 border-ddg-ink shadow-[3px_3px_0_var(--ddg-ink)] hover:shadow-[5px_5px_0_var(--ddg-ink)] hover:-translate-y-0.5 transition-all"
                  >
                    <Plug className="w-4 h-4" /> Conectar Google
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
        {isAdmin && connected && (
          <div className="flex items-center gap-2 text-xs text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" /> Google conectado · fonte de volume ativa
          </div>
        )}

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
