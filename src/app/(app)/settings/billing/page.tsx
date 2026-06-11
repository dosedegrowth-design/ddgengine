/**
 * /settings/billing — Plano + cobrança.
 *
 * Visual: padrão brutalist DDG (bracket / ddg-display / lime accents).
 * Sem shadcn Card — só border-2 ddg-ink + brutalist shadow.
 */
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard,
  PlusCircle,
  Zap,
} from "lucide-react";
import { getCurrentOrg } from "@/lib/auth";
import { PLAN_VALUES_BRL } from "@/lib/asaas/api";

function calcDaysLeft(trialEndsAt: string | null | undefined): number {
  if (!trialEndsAt) return 0;
  const ts = new Date(trialEndsAt).getTime();
  const now = new Date().getTime();
  return Math.max(0, Math.ceil((ts - now) / (24 * 60 * 60 * 1000)));
}

/** Formata BRL: inteiro fica "197", decimal fica "119,99". */
function formatBRL(v: number): string {
  return v.toFixed(2).replace(".", ",").replace(",00", "");
}

const PLAN_FEATURES: Record<string, string[]> = {
  trial: ["14 dias grátis", "2 posts gerados"],
  starter: ["4 artigos + 8 FAQs/mês", "Auto-publish no blog", "Aparições em IA — básico"],
  light: ["6 artigos + 12 FAQs/mês", "Auto-publish + categorias", "Aparições em IA — médio"],
  pro: ["8 artigos + 16 FAQs/mês", "Aprovação por WhatsApp", "Aparições em IA — completo"],
  multi: ["16 artigos + 32 FAQs · 3 sites", "Brand RAG avançado", "Suporte prioritário"],
  agency: ["Ilimitado em 30 sites", "White-label", "API + dedicado"],
};

const PLAN_LABEL: Record<string, string> = {
  trial: "Trial",
  starter: "Starter",
  light: "Light",
  pro: "Pro",
  multi: "Multi",
  agency: "Agency",
  native: "Native",
};

const PLAN_TAGLINE: Record<string, string> = {
  starter: "Pra começar a marcar presença",
  light: "Volume médio, ROI claro",
  pro: "O nosso plano mais escolhido",
  multi: "Vários sites, um dashboard",
  agency: "Agência cuidando de clientes",
};

const STATUS_COLOR: Record<string, { bg: string; text: string; chip: string }> = {
  active: {
    bg: "bg-ddg-lime/15 border-ddg-lime",
    text: "text-ddg-ink",
    chip: "bg-ddg-lime text-ddg-ink",
  },
  trial: {
    bg: "bg-amber-50 border-amber-300",
    text: "text-amber-900",
    chip: "bg-amber-500 text-white",
  },
  past_due: {
    bg: "bg-red-50 border-red-300",
    text: "text-red-900",
    chip: "bg-red-600 text-white",
  },
  cancelled: {
    bg: "bg-ddg-stone border-ddg-stone",
    text: "text-ddg-muted",
    chip: "bg-ddg-muted text-ddg-paper",
  },
};

export default async function BillingPage() {
  const { org, supabase } = await getCurrentOrg();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("organization_id", org.id)
    .maybeSingle();

  const daysLeft = calcDaysLeft(org.trial_ends_at);

  const plan = org.plan ?? "trial";
  const isTrial = plan === "trial";
  const statusKey = isTrial ? "trial" : org.status ?? "active";
  const tone = STATUS_COLOR[statusKey] ?? STATUS_COLOR.active;
  const monthlyPrice = PLAN_VALUES_BRL[plan] ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="ddg-bracket mb-1">PLANO &amp; COBRANÇA</div>
        <h2 className="ddg-display text-2xl text-ddg-ink">
          {isTrial ? "Você ainda tá no trial" : "Seu plano"}
        </h2>
        <p className="text-sm text-ddg-muted mt-1 leading-relaxed">
          {isTrial
            ? "Sem cartão. Quando quiser, escolhe um plano e a gente segue."
            : "Mude de plano, cancele ou troque forma de pagamento."}
        </p>
      </div>

      {/* Plano atual */}
      <section
        className={`rounded-2xl border-2 p-5 md:p-7 shadow-[5px_5px_0_var(--ddg-ink)] ${tone.bg}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded ${tone.chip} font-bold`}
              >
                {statusKey}
              </span>
              {isTrial && org.trial_ends_at && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-amber-700">
                  <Clock className="w-3 h-3" />
                  {daysLeft}d restantes
                </span>
              )}
            </div>
            <h3 className={`text-3xl font-black tracking-tight ${tone.text}`}>
              {PLAN_LABEL[plan] ?? plan}
            </h3>
            {!isTrial && (
              <div className="mt-1 text-sm text-ddg-muted">
                R${" "}
                <strong className="text-ddg-ink">
                  {monthlyPrice.toFixed(2).replace(".", ",")}
                </strong>
                /mês
              </div>
            )}
          </div>

          {isTrial ? (
            <Link
              href="#planos"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-ddg-lime text-ddg-ink font-bold text-sm border-2 border-ddg-ink shadow-[3px_3px_0_var(--ddg-ink)] hover:shadow-[5px_5px_0_var(--ddg-ink)] hover:-translate-y-0.5 transition-all"
            >
              Escolher plano
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              href="/contato"
              className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-ddg-muted hover:text-ddg-ink transition-colors"
            >
              Cancelar / falar com a gente
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        {/* Features */}
        <ul className="mt-5 grid sm:grid-cols-2 gap-2 text-sm">
          {(PLAN_FEATURES[plan] ?? []).map((f) => (
            <li key={f} className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-ddg-lime-deep shrink-0 mt-0.5" />
              <span className={tone.text}>{f}</span>
            </li>
          ))}
        </ul>

        {/* Asaas info */}
        {subscription && (
          <div className="mt-5 pt-4 border-t-2 border-ddg-stone/80 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-mono text-ddg-muted">
            <span className="inline-flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" />
              ID Asaas{" "}
              <code className="text-ddg-ink">
                {String(subscription.external_id ?? "—")}
              </code>
            </span>
            {subscription.next_billing_at && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5" />
                Próxima cobrança{" "}
                <strong className="text-ddg-ink">
                  {new Date(
                    subscription.next_billing_at as string
                  ).toLocaleDateString("pt-BR")}
                </strong>
              </span>
            )}
          </div>
        )}
      </section>

      {/* Mudar de plano */}
      <section id="planos">
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="ddg-bracket mb-1">
              {isTrial ? "ESCOLHER" : "MUDAR DE"} PLANO
            </div>
            <h3 className="text-xl font-black tracking-tight text-ddg-ink">
              {isTrial ? "Todos com 14d garantia" : "Upgrade ou downgrade"}
            </h3>
            <p className="text-sm text-ddg-muted mt-1">
              Pague PIX recorrente ou cartão. Anual com 20% off.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
          {(["starter", "light", "pro", "multi"] as const).map((p) => {
            const isCurrent = plan === p;
            const isFeatured = p === "pro";
            return (
              <Link
                key={p}
                href={`/settings/billing/checkout?plan=${p}`}
                className={`group relative rounded-xl border-2 p-4 transition-all hover:-translate-y-0.5 ${
                  isCurrent
                    ? "border-ddg-lime bg-ddg-lime/10 shadow-[3px_3px_0_var(--ddg-lime-deep)]"
                    : isFeatured
                      ? "border-ddg-ink bg-ddg-paper shadow-[3px_3px_0_var(--ddg-ink)] hover:shadow-[5px_5px_0_var(--ddg-ink)]"
                      : "border-ddg-stone bg-ddg-paper hover:border-ddg-ink hover:shadow-[3px_3px_0_var(--ddg-ink)]"
                }`}
              >
                {isFeatured && !isCurrent && (
                  <span className="absolute -top-2 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ddg-ink text-ddg-paper text-[9px] font-mono uppercase tracking-widest font-bold">
                    <Zap className="w-2.5 h-2.5" />
                    Popular
                  </span>
                )}
                {isCurrent && (
                  <span className="absolute -top-2 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ddg-lime text-ddg-ink text-[9px] font-mono uppercase tracking-widest font-bold border-2 border-ddg-ink">
                    Atual
                  </span>
                )}
                <div className="font-black text-lg text-ddg-ink">
                  {PLAN_LABEL[p]}
                </div>
                <div className="text-[11px] font-mono uppercase tracking-widest text-ddg-muted mt-0.5">
                  {PLAN_TAGLINE[p]}
                </div>
                <div className="mt-3 text-2xl font-black text-ddg-ink">
                  R$ {formatBRL(PLAN_VALUES_BRL[p] ?? 0)}
                  <span className="text-xs font-medium text-ddg-muted">/mês</span>
                </div>
                <ul className="mt-3 space-y-1 text-xs text-ddg-muted">
                  {(PLAN_FEATURES[p] ?? []).slice(0, 3).map((f) => (
                    <li key={f} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-ddg-lime-deep shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div
                  className={`mt-4 inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest ${
                    isCurrent ? "text-ddg-lime-deep" : "text-ddg-ink"
                  }`}
                >
                  {isCurrent ? "Plano atual" : "Assinar"}
                  {!isCurrent && (
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-3 rounded-xl border-2 border-dashed border-ddg-stone bg-ddg-cream/30 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <PlusCircle className="w-5 h-5 text-ddg-muted shrink-0" />
            <div className="min-w-0">
              <div className="font-bold text-sm text-ddg-ink">
                Precisa de Agency ou Native?
              </div>
              <p className="text-xs text-ddg-muted">
                White-label, API dedicada, suporte direto. Chama a gente.
              </p>
            </div>
          </div>
          <Link
            href="/contato"
            className="text-xs font-mono uppercase tracking-widest text-ddg-ink hover:text-ddg-lime-deep transition-colors shrink-0"
          >
            Falar →
          </Link>
        </div>
      </section>
    </div>
  );
}
