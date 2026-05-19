/**
 * /settings/billing/checkout — Página de checkout DDG-styled.
 *
 * Layout: form principal à esquerda (lg), order summary sticky à direita.
 * Sem shadcn Card — brutalist DDG (border-2, brackets, lime accents).
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { getCurrentOrg } from "@/lib/auth";
import { PLAN_VALUES_BRL } from "@/lib/asaas/api";
import { CheckoutForm } from "./checkout-form";

const VALID_PLANS = ["starter", "light", "pro", "multi", "agency", "native"];

const PLAN_LABEL: Record<string, string> = {
  starter: "Starter",
  light: "Light",
  pro: "Pro",
  multi: "Multi",
  agency: "Agency",
  native: "Native",
};

const PLAN_INCLUDES: Record<string, string[]> = {
  starter: ["4 artigos + 8 FAQs/mês", "Auto-publish no blog", "Aparições em IA — básico"],
  light: ["6 artigos + 12 FAQs/mês", "Auto-publish + categorias", "Aparições em IA — médio"],
  pro: ["8 artigos + 16 FAQs/mês", "Aprovação por WhatsApp", "Aparições em IA — completo"],
  multi: ["16 artigos + 32 FAQs · 3 sites", "Brand RAG avançado", "Suporte prioritário"],
  agency: ["Ilimitado em 30 sites", "White-label", "API + dedicado"],
  native: ["SDK + integrações nativas", "Suporte 24/7", "Plano sob medida"],
};

function formatBRL(v: number): string {
  return v.toFixed(2).replace(".", ",");
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; cycle?: string }>;
}) {
  const params = await searchParams;
  const plan = params.plan ?? "pro";
  const cycle = (params.cycle ?? "monthly") as "monthly" | "annual";

  if (!VALID_PLANS.includes(plan)) redirect("/settings/billing");

  const { user, org } = await getCurrentOrg();

  const monthly = PLAN_VALUES_BRL[plan] ?? 0;
  const annual = monthly * 12 * 0.8;
  const value = cycle === "annual" ? annual : monthly;

  return (
    <div className="space-y-5">
      <Link
        href="/settings/billing"
        className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-ddg-muted hover:text-ddg-ink transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Voltar pra cobrança
      </Link>

      <div>
        <div className="ddg-bracket mb-1">CHECKOUT</div>
        <h2 className="ddg-display text-2xl text-ddg-ink">
          Plano {PLAN_LABEL[plan] ?? plan}
        </h2>
        <p className="text-sm text-ddg-muted mt-1">
          {cycle === "annual" ? "Cobrança anual (20% off)" : "Cobrança mensal"} ·
          Cancele quando quiser
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Form principal */}
        <div className="lg:col-span-2 rounded-2xl border-2 border-ddg-ink bg-ddg-paper p-5 md:p-7 shadow-[5px_5px_0_var(--ddg-ink)]">
          <CheckoutForm
            orgId={org.id}
            userEmail={user.email ?? ""}
            userName={(user.user_metadata?.name as string) ?? org.name}
            plan={plan}
            cycle={cycle}
            value={value}
          />
        </div>

        {/* Order summary */}
        <aside className="space-y-4 lg:sticky lg:top-6 self-start">
          <section className="rounded-2xl border-2 border-ddg-ink bg-ddg-cream/40 p-5">
            <div className="ddg-bracket mb-3">SEU PEDIDO</div>

            <div className="flex items-baseline justify-between gap-2 pb-3 border-b-2 border-ddg-stone">
              <div>
                <div className="font-black text-lg text-ddg-ink">
                  {PLAN_LABEL[plan] ?? plan}
                </div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-ddg-muted">
                  {cycle === "annual" ? "1× anual" : "Mensal recorrente"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-ddg-ink">
                  R$ {formatBRL(value)}
                </div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-ddg-muted">
                  /{cycle === "annual" ? "ano" : "mês"}
                </div>
              </div>
            </div>

            {/* Cycle switch (link, server-rendered) */}
            <div className="mt-3 flex flex-col gap-1.5">
              <CycleOption
                active={cycle === "monthly"}
                label="Mensal"
                value={`R$ ${formatBRL(monthly)}/mês`}
                href={`/settings/billing/checkout?plan=${plan}&cycle=monthly`}
              />
              <CycleOption
                active={cycle === "annual"}
                label="Anual"
                value={`R$ ${formatBRL(annual)}/ano`}
                badge="20% off"
                href={`/settings/billing/checkout?plan=${plan}&cycle=annual`}
              />
            </div>
          </section>

          <section className="rounded-2xl border-2 border-ddg-stone bg-ddg-paper p-5">
            <div className="ddg-bracket mb-3">INCLUI</div>
            <ul className="space-y-2 text-sm">
              {(PLAN_INCLUDES[plan] ?? []).map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-ddg-lime-deep shrink-0 mt-0.5" />
                  <span className="text-ddg-ink">{f}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border-2 border-dashed border-ddg-stone bg-ddg-cream/30 p-4 space-y-2.5 text-xs text-ddg-muted">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-ddg-lime-deep shrink-0 mt-0.5" />
              <span>
                Cobrança via <strong className="text-ddg-ink">Asaas</strong> —
                regulamentado pelo BCB.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-ddg-muted shrink-0 mt-0.5" />
              <span>14 dias de garantia — devolução integral se não curtir.</span>
            </div>
            <div className="flex items-start gap-2">
              <CalendarClock className="w-4 h-4 text-ddg-muted shrink-0 mt-0.5" />
              <span>Cancele quando quiser pelo painel ou WhatsApp.</span>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function CycleOption({
  active,
  label,
  value,
  badge,
  href,
}: {
  active: boolean;
  label: string;
  value: string;
  badge?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border-2 text-sm transition-all ${
        active
          ? "border-ddg-ink bg-ddg-paper shadow-[2px_2px_0_var(--ddg-ink)]"
          : "border-transparent hover:border-ddg-stone hover:bg-ddg-paper"
      }`}
    >
      <span className="flex items-center gap-2 min-w-0">
        <span
          className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 ${
            active
              ? "border-ddg-ink bg-ddg-lime"
              : "border-ddg-stone"
          }`}
          aria-hidden
        />
        <span className={active ? "font-bold text-ddg-ink" : "text-ddg-muted"}>
          {label}
        </span>
        {badge && (
          <span className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-ddg-lime text-ddg-ink font-bold border border-ddg-ink">
            {badge}
          </span>
        )}
      </span>
      <span
        className={`text-xs font-mono ${
          active ? "text-ddg-ink" : "text-ddg-muted"
        }`}
      >
        {value}
      </span>
    </Link>
  );
}
