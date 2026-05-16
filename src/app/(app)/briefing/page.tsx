/**
 * Briefing view — mostra a ficha refinada da marca em modo leitura
 *
 * Pra editar de novo, redirecionamos pro /onboarding (que cuida
 * de todo o fluxo de quiz + áudio + refine + revisão).
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ClipboardList, FileText, Sparkles } from "lucide-react";
import { getCurrentSite } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import type { RefinedBrief } from "@/lib/briefing/questions";

export default async function BriefingPage() {
  const { site, supabase } = await getCurrentSite();

  if (!site) redirect("/onboarding");

  const { data: briefing } = await supabase
    .from("briefings")
    .select("id, refined_brief, raw_answers, completion_status, completed_at")
    .eq("site_id", site.id)
    .maybeSingle();

  if (!briefing || !briefing.refined_brief) {
    return (
      <div>
        <PageHeader
          bracket="BRIEFING"
          title="Ficha da marca"
          subtitle="A engine ainda não conhece sua marca."
        />
        <div className="container mx-auto max-w-3xl px-6 py-8">
          <EmptyState
            icon={ClipboardList}
            title="Briefing não preenchido"
            description="Pra engine criar conteúdo na voz da sua marca, ela precisa entender seu negócio primeiro. São 12 perguntas que você pode responder por texto ou áudio."
            cta={{ label: "Preencher briefing", href: "/onboarding" }}
          />
        </div>
      </div>
    );
  }

  const brief = briefing.refined_brief as RefinedBrief;

  return (
    <div>
      <PageHeader
        bracket="BRIEFING"
        title="Ficha da marca"
        subtitle={
          briefing.completed_at && (
            <span>
              Finalizado em{" "}
              <strong className="text-ddg-ink">
                {new Date(briefing.completed_at).toLocaleDateString("pt-BR")}
              </strong>
            </span>
          )
        }
        actions={
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-ddg-ink text-ddg-ink font-medium text-sm hover:bg-ddg-ink hover:text-ddg-paper transition-colors"
          >
            Editar briefing
            <ArrowRight className="w-4 h-4" />
          </Link>
        }
      />

      <div className="container mx-auto max-w-4xl px-6 py-8 space-y-6">
        <Section title="Identidade" icon={FileText}>
          <Field label="Empresa" value={brief.identity?.company_name} />
          <Field label="O que faz" value={brief.identity?.description} />
          <Field
            label="Pitch expandido"
            value={brief.identity?.elevator_pitch}
            multiline
          />
        </Section>

        <Section title="Público-alvo" icon={Sparkles}>
          <Field
            label="Cliente ideal"
            value={brief.audience?.ideal_customer}
            multiline
          />
          <Field label="Maior dor que resolve" value={brief.audience?.main_pain} />
        </Section>

        <Section title="Posicionamento" icon={Sparkles}>
          <Field
            label="Diferenciais"
            value={brief.positioning?.differentials?.join("\n")}
            multiline
          />
          <Field
            label="Valor único"
            value={brief.positioning?.unique_value}
            multiline
          />
        </Section>

        <Section title="Voz da marca" icon={Sparkles}>
          <Field label="Tom" value={brief.voice?.tone} />
          <Field
            label="Estilo de escrita"
            value={brief.voice?.style_notes}
            multiline
          />
          {(brief.voice?.expressions_to_use?.length ?? 0) > 0 && (
            <Field
              label="Expressões usar"
              value={brief.voice?.expressions_to_use?.join(", ")}
            />
          )}
          {(brief.voice?.expressions_to_avoid?.length ?? 0) > 0 && (
            <Field
              label="Expressões evitar"
              value={brief.voice?.expressions_to_avoid?.join(", ")}
            />
          )}
        </Section>

        <Section title="SEO" icon={Sparkles}>
          <Field
            label="Keywords primárias"
            value={brief.seo?.primary_keywords?.join(", ")}
          />
          {(brief.seo?.secondary_keywords?.length ?? 0) > 0 && (
            <Field
              label="Keywords secundárias"
              value={brief.seo?.secondary_keywords?.join(", ")}
            />
          )}
        </Section>

        <Section title="Visibility em IA" icon={Sparkles}>
          <Field
            label="Perguntas-alvo"
            value={brief.visibility_goal?.target_questions?.join("\n")}
            multiline
          />
        </Section>

        {(brief.market?.competitors?.length ?? 0) > 0 && (
          <Section title="Concorrentes" icon={Sparkles}>
            <Field
              label="Lista"
              value={brief.market?.competitors?.join(", ")}
            />
          </Section>
        )}

        {(brief.storytelling?.case_summaries?.length ?? 0) > 0 && (
          <Section title="Casos e histórias" icon={Sparkles}>
            {brief.storytelling.case_summaries.map((c, i) => (
              <Field key={i} label={`Case ${i + 1}`} value={c} multiline />
            ))}
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border-2 border-ddg-ink bg-ddg-paper p-5 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-ddg-lime-deep" />
        <h2 className="text-lg font-black text-ddg-ink">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value?: string | null;
  multiline?: boolean;
}) {
  if (!value || !value.trim()) return null;
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-widest text-ddg-muted mb-1">
        {label}
      </div>
      <div
        className={`text-sm text-ddg-ink leading-relaxed ${
          multiline ? "whitespace-pre-wrap" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
