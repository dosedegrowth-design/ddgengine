/**
 * Banner de status da conta — domina o topo do dashboard quando a org
 * NÃO está em status='active'.
 *
 *  trial_expired → amarelo forte com countdown de 7d e CTA "Escolher plano"
 *  cancelled     → cinza, conta desativada, CTA "Reativar"
 *  paused        → amarelo claro, pagamento em atraso
 *
 * Renderiza acima de qualquer outra coisa (IntegrationBanner inclusive).
 */
import Link from "next/link";
import { AlertTriangle, Clock, XCircle, ArrowRight } from "lucide-react";

interface Props {
  status: string;
  trialExpiredAt: string | null;
}

const GRACE_DAYS = 7;

export function AccountStatusBanner({ status, trialExpiredAt }: Props) {
  if (status === "active") return null;

  if (status === "trial_expired") {
    let daysLeft = GRACE_DAYS;
    if (trialExpiredAt) {
      const elapsed =
        (Date.now() - new Date(trialExpiredAt).getTime()) / (1000 * 60 * 60 * 24);
      daysLeft = Math.max(0, Math.ceil(GRACE_DAYS - elapsed));
    }

    return (
      <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-base text-amber-900">
              Seu trial acabou
            </div>
            <p className="text-sm text-amber-800 mt-1 leading-relaxed">
              {daysLeft > 0 ? (
                <>
                  Você tem <strong>{daysLeft} {daysLeft === 1 ? "dia" : "dias"}</strong>{" "}
                  pra escolher um plano antes do blog sair do ar.
                </>
              ) : (
                <>Sua conta vai ser desativada nas próximas horas.</>
              )}
            </p>
          </div>
        </div>
        <Link
          href="/settings/billing"
          className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-900 text-white text-sm font-bold hover:bg-amber-950 transition-colors"
        >
          Escolher plano
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  if (status === "cancelled") {
    return (
      <div className="rounded-2xl border-2 border-stone-400 bg-stone-100 p-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <XCircle className="w-6 h-6 text-stone-700 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-base text-stone-900">
              Conta desativada
            </div>
            <p className="text-sm text-stone-700 mt-1 leading-relaxed">
              Seu blog não está mais publicado. Posts e configurações ficam
              guardados por <strong>90 dias</strong> — reative pra voltar ao ar.
            </p>
          </div>
        </div>
        <Link
          href="/settings/billing"
          className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-ddg-ink text-ddg-paper text-sm font-bold hover:bg-ddg-graphite transition-colors"
        >
          Reativar
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  if (status === "paused") {
    return (
      <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Clock className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm text-amber-900">
              Pagamento em atraso
            </div>
            <p className="text-sm text-amber-800 mt-1 leading-relaxed">
              Regularize a próxima fatura pra manter o blog no ar.
            </p>
          </div>
        </div>
        <Link
          href="/settings/billing"
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-900 text-white text-sm font-bold hover:bg-amber-950 transition-colors"
        >
          Ver fatura
        </Link>
      </div>
    );
  }

  return null;
}
