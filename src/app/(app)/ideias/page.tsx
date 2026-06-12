/**
 * Ideias / Fontes — reaproveitamento de conteúdo.
 *
 * O cliente cola um link (notícia, vídeo, post) ou um texto, e a engine
 * adapta num post original na voz da marca dele. Precisa do briefing pronto
 * (a IA usa a voz aprendida).
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { Lightbulb, Sparkles, Link2, Video, ClipboardPaste } from "lucide-react";
import { getCurrentSite } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/page-header";
import { IdeasForm } from "@/components/dashboard/ideas-form";

export default async function IdeiasPage() {
  const { site, supabase } = await getCurrentSite();
  if (!site) redirect("/onboarding");

  const { data: briefing } = await supabase
    .from("briefings")
    .select("completion_status, embedding_status")
    .eq("site_id", site.id)
    .maybeSingle();

  const briefingReady =
    briefing?.embedding_status === "done" ||
    briefing?.completion_status === "completed";

  return (
    <div>
      <PageHeader
        bracket="CONTEÚDO"
        title="Ideias"
        subtitle={
          <span>
            Transforme conteúdos que você gosta em posts originais pro seu blog
          </span>
        }
      />

      <div className="container mx-auto max-w-3xl px-6 py-8 space-y-6">
        {!briefingReady ? (
          <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-amber-700 shrink-0" />
            <div className="text-sm flex-1">
              <strong className="text-amber-900">Termine o briefing</strong>
              <span className="text-amber-800">
                {" "}— a engine precisa aprender sua voz antes de adaptar
                conteúdos.
              </span>
            </div>
            <Link
              href="/briefing"
              className="text-xs font-mono uppercase tracking-widest text-amber-900 hover:underline shrink-0"
            >
              Ir pro briefing →
            </Link>
          </div>
        ) : (
          <>
            <IdeasForm />

            {/* Como funciona */}
            <div className="grid sm:grid-cols-3 gap-3">
              <HowCard
                icon={Link2}
                step="1"
                title="Cole a fonte"
                text="Um link de notícia, post ou vídeo do YouTube — ou cole o texto direto."
              />
              <HowCard
                icon={Sparkles}
                step="2"
                title="A engine adapta"
                text="Reescreve 100% original na sua voz, com SEO e otimizado pra IAs."
              />
              <HowCard
                icon={Lightbulb}
                step="3"
                title="Você revisa"
                text="O post cai em rascunho. Você ajusta e publica quando quiser."
              />
            </div>

            <p className="text-xs text-ddg-muted flex items-center gap-2 justify-center text-center">
              <Video className="w-3.5 h-3.5 shrink-0" />
              Artigos, notícias e posts
              <span className="opacity-40">·</span>
              <ClipboardPaste className="w-3.5 h-3.5 shrink-0" />
              Ou cole o texto que quiser
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function HowCard({
  icon: Icon,
  step,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  step: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border-2 border-ddg-stone bg-ddg-paper p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md border-2 border-ddg-ink bg-ddg-lime/20">
          <Icon className="w-3.5 h-3.5 text-ddg-ink" />
        </div>
        <span className="text-[10px] font-mono uppercase tracking-widest text-ddg-muted">
          Passo {step}
        </span>
      </div>
      <div className="font-bold text-sm text-ddg-ink mb-1">{title}</div>
      <p className="text-xs text-ddg-muted">{text}</p>
    </div>
  );
}
