"use client";

/**
 * Accordion com tutoriais passo-a-passo dos 5 principais registradores BR.
 *
 * Cliente clica no card do registrador dele → expande passos numerados.
 * Cada passo tem título + descrição + uiHint destacado + warning quando aplicável.
 * Botão "Não acho meu registrador" → abre WhatsApp com mensagem pré-formatada.
 *
 * Visuals extras (sem fotos reais ainda):
 *   - Indicador "Passo X de N" no topo do conteúdo expandido
 *   - Mock UI inline por passo (sidebar nav, ns-replace, toggle, radio, button row, login form)
 *   - Suporte futuro a screenshot real (campo opcional em TutorialStep — se vier, substitui o mock)
 *   - PROBLEMAS COMUNS com hierarquia visual (cor âmbar, ícone)
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
  ArrowRight,
  Check,
  Circle,
  AlertCircle,
  MousePointer2,
} from "lucide-react";
import {
  REGISTRARS,
  type Registrar,
  type TutorialStep,
  type StepMock,
} from "@/lib/blog/registrar-tutorials";

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
  const totalSteps = registrar.steps.length;

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
          <div className="flex flex-wrap items-center gap-2 mb-5">
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
            <span className="ml-auto text-[10px] font-mono uppercase tracking-widest text-ddg-muted">
              {totalSteps} passos
            </span>
          </div>

          {/* Steps */}
          <ol className="space-y-4">
            {registrar.steps.map((step) => (
              <StepItem
                key={step.num}
                step={step}
                totalSteps={totalSteps}
              />
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
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 border border-amber-300 text-[9px] font-mono font-bold uppercase tracking-widest text-amber-900">
                  <AlertCircle className="w-2.5 h-2.5" />
                  Problemas comuns
                </span>
              </div>
              <div className="rounded-lg border-2 border-amber-200 bg-amber-50/40 divide-y divide-amber-200">
                {registrar.commonIssues.map((issue, i) => (
                  <details key={i} className="group">
                    <summary className="flex items-start gap-2 cursor-pointer list-none p-2.5 hover:bg-amber-50">
                      <ChevronRight className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5 group-open:rotate-90 transition-transform" />
                      <span className="font-bold text-xs text-amber-900 flex-1">
                        {issue.q}
                      </span>
                    </summary>
                    <p className="text-xs text-amber-900/80 leading-relaxed px-2.5 pb-2.5 pl-7">
                      {issue.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Renderiza 1 step com numerador, título, descrição, uiHint, warning,
 * e — se houver — screenshot real OU mock UI inline.
 */
function StepItem({
  step,
  totalSteps,
}: {
  step: TutorialStep;
  totalSteps: number;
}) {
  return (
    <li className="flex gap-3">
      <div className="shrink-0 flex flex-col items-center gap-1">
        <div className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-ddg-lime border-2 border-ddg-ink text-ddg-ink font-black text-xs shadow-[2px_2px_0_var(--ddg-ink)]">
          {step.num}
        </div>
        <span className="text-[9px] font-mono uppercase tracking-widest text-ddg-muted">
          {step.num}/{totalSteps}
        </span>
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="font-bold text-sm text-ddg-ink mb-1">
          {step.title}
        </div>
        <p className="text-xs text-ddg-muted leading-relaxed">
          {step.description}
        </p>

        {step.uiHint && (
          <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-1 rounded bg-ddg-ink text-ddg-paper">
            <MousePointer2 className="w-3 h-3 text-ddg-lime" />
            {step.uiHint}
          </div>
        )}

        {/* Visual: screenshot real OU mock UI inline */}
        {step.screenshot ? (
          <div className="mt-3 rounded-lg border-2 border-ddg-ink overflow-hidden shadow-[3px_3px_0_var(--ddg-ink)] bg-ddg-paper">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={step.screenshot.url}
              alt={step.screenshot.alt}
              className="block w-full h-auto"
              loading="lazy"
            />
          </div>
        ) : step.mock ? (
          <div className="mt-3">
            <StepMockUI mock={step.mock} />
          </div>
        ) : null}

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
  );
}

/**
 * Mock UI inline — desenha em CSS/HTML uma referência visual simplificada
 * do que o cliente vai ver. Não é screenshot, é só pra ele se localizar.
 * Padrão brutalist DDG (bordas 2px, shadows offset, cores tokens).
 */
function StepMockUI({ mock }: { mock: StepMock }) {
  if (mock.type === "sidebar-nav") {
    return (
      <MockFrame label="Visão simplificada do menu">
        <div className="flex">
          <div className="w-1/3 min-w-[120px] bg-ddg-cream border-r-2 border-ddg-ink p-1.5 space-y-1">
            {mock.items.map((item, i) => {
              const isActive = i === mock.highlightIndex;
              return (
                <div
                  key={i}
                  className={`text-[10px] px-2 py-1 rounded font-medium flex items-center gap-1.5 ${
                    isActive
                      ? "bg-ddg-lime border-2 border-ddg-ink text-ddg-ink font-black shadow-[1px_1px_0_var(--ddg-ink)]"
                      : "text-ddg-muted"
                  }`}
                >
                  {isActive && (
                    <ArrowRight className="w-2.5 h-2.5" strokeWidth={3} />
                  )}
                  {item}
                </div>
              );
            })}
          </div>
          <div className="flex-1 bg-ddg-paper p-3">
            <div className="h-2 w-1/2 bg-ddg-stone rounded mb-2" />
            <div className="h-2 w-3/4 bg-ddg-stone rounded mb-2" />
            <div className="h-2 w-2/3 bg-ddg-stone rounded" />
          </div>
        </div>
      </MockFrame>
    );
  }

  if (mock.type === "ns-replace") {
    return (
      <MockFrame label="Substituição dos nameservers">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-2 md:gap-3 items-center p-3">
          {/* Antes */}
          <div>
            <div className="text-[9px] font-mono uppercase tracking-widest text-ddg-muted mb-1.5">
              Antes
            </div>
            <div className="space-y-1.5">
              {mock.before.map((ns, i) => (
                <div
                  key={i}
                  className="font-mono text-[10px] px-2 py-1.5 rounded bg-ddg-paper border-2 border-ddg-stone text-ddg-muted line-through decoration-2 decoration-red-400"
                >
                  {ns}
                </div>
              ))}
            </div>
          </div>
          {/* Seta */}
          <div className="hidden md:flex items-center justify-center text-ddg-ink">
            <ArrowRight className="w-5 h-5" strokeWidth={3} />
          </div>
          <div className="flex md:hidden items-center justify-center text-ddg-ink py-1">
            <ChevronDown className="w-5 h-5" strokeWidth={3} />
          </div>
          {/* Depois */}
          <div>
            <div className="text-[9px] font-mono uppercase tracking-widest text-ddg-lime-deep mb-1.5">
              Depois
            </div>
            <div className="space-y-1.5">
              {mock.after.map((ns, i) => (
                <div
                  key={i}
                  className="font-mono text-[10px] px-2 py-1.5 rounded bg-ddg-lime border-2 border-ddg-ink text-ddg-ink font-bold shadow-[1px_1px_0_var(--ddg-ink)]"
                >
                  {ns}
                </div>
              ))}
            </div>
          </div>
        </div>
      </MockFrame>
    );
  }

  if (mock.type === "toggle") {
    const isOn = mock.state === "on";
    return (
      <MockFrame label="Toggle no painel">
        <div className="flex items-center justify-between gap-3 p-3 bg-ddg-paper">
          <span className="text-xs font-medium text-ddg-ink">
            {mock.label}
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`text-[9px] font-mono uppercase tracking-widest ${
                isOn ? "text-ddg-lime-deep font-bold" : "text-ddg-muted"
              }`}
            >
              {isOn ? "ON" : "OFF"}
            </span>
            <div
              className={`relative w-10 h-5 rounded-full border-2 border-ddg-ink transition-colors ${
                isOn ? "bg-ddg-lime" : "bg-ddg-stone"
              }`}
            >
              <div
                className={`absolute top-0.5 w-3 h-3 rounded-full bg-ddg-ink transition-all ${
                  isOn ? "left-[20px]" : "left-0.5"
                }`}
              />
            </div>
          </div>
        </div>
      </MockFrame>
    );
  }

  if (mock.type === "radio-choice") {
    return (
      <MockFrame label="Opções no painel">
        <div className="p-3 space-y-2 bg-ddg-paper">
          {mock.options.map((opt, i) => {
            const isSelected = i === mock.selectedIndex;
            return (
              <div
                key={i}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-md border-2 ${
                  isSelected
                    ? "border-ddg-ink bg-ddg-lime/30 shadow-[2px_2px_0_var(--ddg-ink)]"
                    : "border-ddg-stone bg-ddg-cream/40"
                }`}
              >
                {isSelected ? (
                  <div className="shrink-0 w-3.5 h-3.5 rounded-full border-2 border-ddg-ink bg-ddg-paper flex items-center justify-center">
                    <Check
                      className="w-2 h-2 text-ddg-ink"
                      strokeWidth={4}
                    />
                  </div>
                ) : (
                  <Circle className="shrink-0 w-3.5 h-3.5 text-ddg-muted" />
                )}
                <span
                  className={`text-xs ${
                    isSelected
                      ? "text-ddg-ink font-bold"
                      : "text-ddg-muted"
                  }`}
                >
                  {opt}
                </span>
              </div>
            );
          })}
        </div>
      </MockFrame>
    );
  }

  if (mock.type === "button-row") {
    return (
      <MockFrame label={mock.context ?? "Botão no painel"}>
        <div className="flex items-center justify-between p-3 bg-ddg-paper">
          <div className="space-y-1.5 flex-1 min-w-0 pr-3">
            <div className="h-2 w-3/4 bg-ddg-stone rounded" />
            <div className="h-2 w-1/2 bg-ddg-stone rounded" />
          </div>
          <button
            type="button"
            disabled
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-ddg-lime border-2 border-ddg-ink text-ddg-ink text-[11px] font-bold shadow-[2px_2px_0_var(--ddg-ink)] cursor-default"
          >
            <MousePointer2 className="w-3 h-3" strokeWidth={3} />
            {mock.buttonLabel}
          </button>
        </div>
      </MockFrame>
    );
  }

  if (mock.type === "login-form") {
    return (
      <MockFrame label={`Tela de login ${mock.brand}`}>
        <div className="p-4 bg-ddg-paper space-y-2.5">
          <div className="text-[11px] font-bold text-ddg-ink">
            Entrar — {mock.brand}
          </div>
          <div className="space-y-1.5">
            <div className="text-[9px] font-mono uppercase tracking-widest text-ddg-muted">
              CPF / CNPJ
            </div>
            <div className="h-7 rounded border-2 border-ddg-stone bg-ddg-cream/40" />
          </div>
          <div className="space-y-1.5">
            <div className="text-[9px] font-mono uppercase tracking-widest text-ddg-muted">
              Senha
            </div>
            <div className="h-7 rounded border-2 border-ddg-stone bg-ddg-cream/40" />
          </div>
          <div className="flex justify-end pt-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-ddg-ink text-ddg-paper text-[11px] font-bold">
              Acessar conta
              <ArrowRight className="w-3 h-3" strokeWidth={3} />
            </div>
          </div>
        </div>
      </MockFrame>
    );
  }

  // Exhaustiveness — TypeScript garante que todos os casos foram cobertos
  const _exhaustive: never = mock;
  return _exhaustive;
}

/**
 * Frame brutalist comum a todos os mocks. Header com label "Mock" + corpo.
 */
function MockFrame({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border-2 border-ddg-ink bg-ddg-paper overflow-hidden shadow-[3px_3px_0_var(--ddg-ink)]">
      <div className="flex items-center justify-between px-2.5 py-1 bg-ddg-ink text-ddg-paper">
        <span className="text-[8px] font-mono uppercase tracking-[0.2em]">
          Mock · {label}
        </span>
        <span className="flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-ddg-muted" />
          <span className="w-1.5 h-1.5 rounded-full bg-ddg-muted" />
          <span className="w-1.5 h-1.5 rounded-full bg-ddg-lime" />
        </span>
      </div>
      {children}
    </div>
  );
}
