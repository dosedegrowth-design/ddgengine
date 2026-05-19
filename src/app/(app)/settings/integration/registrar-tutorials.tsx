"use client";

/**
 * Accordion com tutoriais passo-a-passo dos 5 principais registradores BR.
 *
 * Cliente clica no card do registrador dele → expande passos numerados.
 * Cada passo tem título + descrição + uiHint destacado + warning quando aplicável.
 * Botão "Não acho meu registrador" → abre WhatsApp com mensagem pré-formatada.
 */
import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  AlertTriangle,
  Clock,
  HelpCircle,
  MessageCircle,
} from "lucide-react";
import { REGISTRARS, type Registrar } from "@/lib/blog/registrar-tutorials";

interface Props {
  /** Os 2 nameservers que o cliente vai colar — mostrados ao lado dos steps */
  nameservers: string[];
  /** Pra link de WhatsApp "não acho meu registrador" */
  domain: string;
}

export function RegistrarTutorials({ nameservers, domain }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const supportPhone =
    process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "5511999999999";
  const waMsg = encodeURIComponent(
    `Oi! Não achei meu registrador na lista de tutoriais. Meu domínio é ${domain}. Pode me guiar?`
  );
  const waUrl = `https://wa.me/${supportPhone}?text=${waMsg}`;

  return (
    <div className="space-y-2">
      <div className="ddg-bracket mb-3">TUTORIAL POR REGISTRADOR</div>
      <p className="text-sm text-ddg-muted leading-relaxed mb-4">
        Onde você comprou o domínio? Clica e segue o passo-a-passo.
      </p>

      {REGISTRARS.map((reg) => {
        const isOpen = openId === reg.id;
        return (
          <RegistrarCard
            key={reg.id}
            registrar={reg}
            open={isOpen}
            onToggle={() => setOpenId(isOpen ? null : reg.id)}
            nameservers={nameservers}
          />
        );
      })}

      {/* Fallback: registrador não listado */}
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between gap-3 p-4 rounded-xl border-2 border-dashed border-ddg-stone bg-ddg-cream/30 hover:border-ddg-ink hover:bg-ddg-lime/10 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-ddg-stone border-2 border-ddg-ink">
            <HelpCircle className="w-5 h-5 text-ddg-muted" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-bold text-sm text-ddg-ink">
              Não achei meu registrador
            </div>
            <p className="text-xs text-ddg-muted mt-0.5">
              Chama a gente no WhatsApp que guiamos passo-a-passo.
            </p>
          </div>
        </div>
        <MessageCircle className="w-4 h-4 text-ddg-muted" />
      </a>
    </div>
  );
}

function RegistrarCard({
  registrar,
  open,
  onToggle,
  nameservers,
}: {
  registrar: Registrar;
  open: boolean;
  onToggle: () => void;
  nameservers: string[];
}) {
  return (
    <div
      className={`rounded-xl border-2 overflow-hidden transition-all ${
        open
          ? "border-ddg-ink bg-ddg-paper shadow-[3px_3px_0_var(--ddg-ink)]"
          : "border-ddg-stone bg-ddg-paper hover:border-ddg-ink/40"
      }`}
    >
      {/* Header — sempre visível */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 p-4 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Logo placeholder */}
          <div
            className={`shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg border-2 border-ddg-ink font-black text-sm ${registrar.accentClass}`}
          >
            {registrar.logoText}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm text-ddg-ink flex items-center gap-2 flex-wrap">
              {registrar.name}
              <span className="text-[9px] font-mono uppercase tracking-widest text-ddg-muted">
                <Clock className="w-3 h-3 inline mr-0.5" />
                {registrar.estimatedMinutes} min
              </span>
            </div>
            <p className="text-xs text-ddg-muted mt-0.5 truncate">
              {registrar.tagline}
            </p>
          </div>
        </div>
        {open ? (
          <ChevronDown className="w-4 h-4 text-ddg-muted shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-ddg-muted shrink-0" />
        )}
      </button>

      {/* Conteúdo expandido */}
      {open && (
        <div className="border-t-2 border-ddg-stone bg-ddg-cream/30 p-4 md:p-5">
          {/* Atalhos: login + tutorial oficial */}
          <div className="flex flex-wrap gap-2 mb-5">
            <a
              href={registrar.loginUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-ddg-ink text-ddg-paper text-xs font-bold hover:bg-ddg-graphite transition-colors"
            >
              Abrir {registrar.name}
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href={registrar.officialTutorialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-ddg-stone text-xs text-ddg-muted hover:border-ddg-ink hover:text-ddg-ink transition-colors"
            >
              Tutorial oficial
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Steps */}
          <ol className="space-y-3">
            {registrar.steps.map((step) => (
              <li key={step.num} className="flex gap-3">
                <div className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md bg-ddg-lime border-2 border-ddg-ink text-ddg-ink font-black text-xs">
                  {step.num}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="font-bold text-sm text-ddg-ink mb-1">
                    {step.title}
                  </div>
                  <p className="text-xs text-ddg-muted leading-relaxed">
                    {step.description}
                  </p>
                  {step.uiHint && (
                    <div className="mt-2 inline-block text-[11px] font-mono px-2 py-1 rounded bg-ddg-ink text-ddg-paper">
                      {step.uiHint}
                    </div>
                  )}
                  {step.warning && (
                    <div className="mt-2 flex items-start gap-2 p-2 rounded-md bg-amber-50 border border-amber-200">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-900 leading-relaxed">
                        {step.warning}
                      </p>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>

          {/* Nameservers pra colar (lembrete dentro do tutorial) */}
          {nameservers.length === 2 && (
            <div className="mt-5 p-3 rounded-lg bg-ddg-lime/10 border-2 border-ddg-lime/40">
              <div className="ddg-bracket text-ddg-lime-deep mb-1.5">
                COLE ESTES 2 NAMESERVERS:
              </div>
              {nameservers.map((ns, i) => (
                <code
                  key={i}
                  className="block font-mono text-xs text-ddg-ink py-0.5"
                >
                  {ns}
                </code>
              ))}
            </div>
          )}

          {/* Problemas comuns */}
          {registrar.commonIssues && registrar.commonIssues.length > 0 && (
            <div className="mt-5 pt-4 border-t border-ddg-stone">
              <div className="ddg-bracket mb-2">PROBLEMAS COMUNS</div>
              {registrar.commonIssues.map((issue, i) => (
                <details
                  key={i}
                  className="group py-1.5 border-b border-ddg-stone last:border-0"
                >
                  <summary className="flex items-center gap-1.5 cursor-pointer list-none text-xs text-ddg-ink">
                    <ChevronRight className="w-3.5 h-3.5 text-ddg-muted group-open:rotate-90 transition-transform" />
                    <span className="font-medium">{issue.q}</span>
                  </summary>
                  <p className="text-xs text-ddg-muted leading-relaxed mt-1 pl-5">
                    {issue.a}
                  </p>
                </details>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
