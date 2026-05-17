/**
 * /settings/referrals — programa de afiliados.
 *
 * Mostra:
 * - Link/código pessoal pra compartilhar
 * - Stats (indicações, conversões, saldo em R$)
 * - Histórico de indicações
 * - Histórico de comissões (último mês)
 *
 * Layout: identidade DDG (lime brutalist), sem Cards shadcn antigos.
 */
import { getCurrentOrg } from "@/lib/auth";
import {
  getOrCreateReferralCode,
  getReferralStats,
  getCommissionPct,
  getCommissionMonths,
  isReferralProgramActive,
} from "@/lib/billing/referrals";
import { ReferralLinkBox } from "./referral-link-box";
import { Gift, Sparkles, TrendingUp, Wallet } from "lucide-react";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  signed_up: { label: "Cadastrou", color: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  converted: { label: "Convertido", color: "bg-ddg-lime/15 text-ddg-lime-deep border-ddg-lime/40" },
  rewarded: { label: "Pago", color: "bg-ddg-lime/15 text-ddg-lime-deep border-ddg-lime/40" },
};

function brl(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export default async function ReferralsPage() {
  const { org } = await getCurrentOrg();
  const code = await getOrCreateReferralCode(org.id);
  const stats = await getReferralStats(org.id);
  const pct = getCommissionPct();
  const months = getCommissionMonths();
  const active = isReferralProgramActive();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://ddgengine.vercel.app";
  const link = `${appUrl}/signup?ref=${code}`;

  return (
    <div className="space-y-6">
      {/* Hero do programa */}
      <section className="rounded-2xl border-2 border-ddg-ink bg-ddg-ink text-ddg-paper p-6 md:p-8 relative overflow-hidden">
        <div
          className="absolute -top-24 -right-24 w-80 h-80 rounded-full pointer-events-none opacity-40"
          style={{
            background:
              "radial-gradient(circle, rgba(200,255,61,0.5) 0%, transparent 60%)",
          }}
          aria-hidden
        />
        <div className="relative max-w-2xl">
          <div className="ddg-bracket text-ddg-lime mb-3 inline-block">
            INDIQUE E GANHE
          </div>
          <h1 className="ddg-display text-3xl md:text-4xl text-ddg-paper mb-3">
            Compartilha o que tá funcionando, ganha em cada conversão.
          </h1>
          {active ? (
            <p className="text-sm md:text-base text-ddg-paper/80 leading-relaxed">
              A cada pessoa que assinar pelo seu link, você ganha{" "}
              <strong className="text-ddg-lime">{pct}%</strong> do que ela pagar
              {" "}— por <strong className="text-ddg-lime">{months} meses</strong>.
              Recebe direto via Pix quando solicitar saque.
            </p>
          ) : (
            <p className="text-sm md:text-base text-ddg-paper/80 leading-relaxed">
              <strong className="text-ddg-lime">Programa em ativação.</strong>{" "}
              Pode começar a indicar agora — todas as conversões serão registradas
              e as comissões pagas retroativamente quando o programa for liberado
              oficialmente. As regras finais (% e duração) serão comunicadas em breve.
            </p>
          )}
        </div>
      </section>

      {/* Link box */}
      <section className="rounded-2xl border-2 border-ddg-ink bg-ddg-paper p-5 md:p-6">
        <div className="ddg-bracket mb-3">SEU LINK</div>
        <ReferralLinkBox link={link} code={code} />
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Kpi
          icon={Sparkles}
          label="Indicações"
          value={stats.total}
          hint="pessoas que clicaram no seu link e criaram conta"
        />
        <Kpi
          icon={TrendingUp}
          label="Convertidos"
          value={stats.converted}
          hint="viraram pagantes"
          accent
        />
        <Kpi
          icon={Wallet}
          label="Saldo disponível"
          value={brl(stats.availableCents)}
          hint="pronto pra sacar"
        />
        <Kpi
          icon={Gift}
          label="Total ganho"
          value={brl(stats.totalEarnedCents)}
          hint="histórico completo"
        />
      </section>

      {/* Saque */}
      {stats.availableCents > 0 && (
        <section className="rounded-2xl border-2 border-ddg-lime bg-ddg-lime/10 p-5 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-bold text-ddg-ink">
              Você tem {brl(stats.availableCents)} disponível pra saque
            </div>
            <p className="text-xs text-ddg-muted mt-1">
              Saque mínimo R$ 50,00. Recebe via Pix em até 3 dias úteis.
            </p>
          </div>
          <button
            type="button"
            disabled={stats.availableCents < 5000}
            className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-ddg-lime text-ddg-ink font-bold text-sm border-2 border-ddg-ink shadow-[3px_3px_0_var(--ddg-ink)] hover:shadow-[5px_5px_0_var(--ddg-ink)] hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-[3px_3px_0_var(--ddg-ink)] disabled:hover:translate-y-0"
          >
            {stats.availableCents < 5000 ? "Mínimo R$ 50,00" : "Solicitar saque"}
          </button>
        </section>
      )}

      {/* Histórico de indicações */}
      <section className="rounded-2xl border-2 border-ddg-ink bg-ddg-paper p-5 md:p-6">
        <div className="mb-4">
          <div className="ddg-bracket mb-1">HISTÓRICO</div>
          <h2 className="text-lg font-black text-ddg-ink">
            Suas indicações
          </h2>
        </div>

        {stats.referrals.length === 0 ? (
          <div className="py-8 text-center">
            <Sparkles className="w-8 h-8 text-ddg-muted mx-auto mb-3 opacity-50" />
            <p className="text-sm text-ddg-muted max-w-md mx-auto leading-relaxed">
              Ainda não indicou ninguém. Copia seu link aí em cima e compartilha
              com alguém que precisa de blog + IA visibility.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {stats.referrals.map((r) => {
              const meta = STATUS_LABEL[r.status] ?? {
                label: r.status,
                color: "bg-ddg-stone text-ddg-muted border-ddg-stone",
              };
              return (
                <li
                  key={r.id}
                  className="flex items-center justify-between p-3 rounded-lg border-2 border-ddg-stone"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-mono text-ddg-ink">
                      {r.referral_code}
                    </div>
                    <div className="text-xs text-ddg-muted mt-0.5">
                      Indicado em{" "}
                      {new Date(r.signed_up_at ?? r.created_at).toLocaleDateString(
                        "pt-BR"
                      )}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest border ${meta.color}`}
                  >
                    {meta.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border-2 p-4 md:p-5 ${
        accent
          ? "bg-ddg-ink border-ddg-ink text-ddg-paper shadow-[6px_6px_0_var(--ddg-lime)]"
          : "bg-ddg-paper border-ddg-ink"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon
          className={`w-4 h-4 ${
            accent ? "text-ddg-lime" : "text-ddg-muted"
          }`}
        />
        <div
          className={`text-[10px] font-mono uppercase tracking-widest ${
            accent ? "text-ddg-paper/60" : "text-ddg-muted"
          }`}
        >
          {label}
        </div>
      </div>
      <div
        className={`text-2xl md:text-3xl font-black tabular-nums ${
          accent ? "text-ddg-paper" : "text-ddg-ink"
        }`}
      >
        {value}
      </div>
      {hint && (
        <p
          className={`text-xs mt-1.5 leading-snug ${
            accent ? "text-ddg-paper/60" : "text-ddg-muted"
          }`}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
