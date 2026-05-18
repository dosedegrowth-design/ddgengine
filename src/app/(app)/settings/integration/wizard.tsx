"use client";

/**
 * Wizard interativo de conexão de domínio.
 *
 * 3 passos:
 *  Step 1 — Iniciar (DDG cria zona Cloudflare)
 *  Step 2 — Trocar nameservers (cliente faz no registrador)
 *  Step 3 — Verificar (DDG checa propagação)
 *
 * State controla qual step está ativo:
 *  preview      → step 1 ativo
 *  zone_created → step 2 ativo (mostra os 2 NS)
 *  verifying    → step 3 ativo (loading)
 *  active       → tudo concluído (parent já mostra check verde)
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  Copy,
  Globe,
  Loader2,
  Server,
  Shield,
  ExternalLink,
} from "lucide-react";
import {
  initiateDomainConnection,
  verifyDomainConnection,
} from "./actions";

interface Props {
  siteId: string;
  domain: string;
  state: string;
  nameservers: string[];
}

const REGISTRARS: Array<{ name: string; tutorial: string }> = [
  {
    name: "Registro.br",
    tutorial: "https://registro.br/ajuda/?secao=dns&pergunta=alterar-dns",
  },
  {
    name: "GoDaddy",
    tutorial:
      "https://br.godaddy.com/help/alterar-meus-servidores-de-nomes-664",
  },
  {
    name: "HostGator",
    tutorial:
      "https://suporte.hostgator.com.br/hc/pt-br/articles/115005617413",
  },
];

export function IntegrationWizard({
  siteId,
  domain,
  state,
  nameservers,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function handleStart() {
    start(async () => {
      const r = await initiateDomainConnection(siteId);
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Zona criada! Veja os nameservers no Passo 2.");
      router.refresh();
    });
  }

  function handleVerify() {
    start(async () => {
      const r = await verifyDomainConnection(siteId);
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      if ("verified" in r && r.verified) {
        toast.success("DNS propagado! Estamos ativando seu blog…");
      } else {
        toast.info(
          "DNS ainda não propagou. Tenta de novo em alguns minutos."
        );
      }
      router.refresh();
    });
  }

  function copyValue(value: string) {
    navigator.clipboard.writeText(value);
    toast.success("Copiado!");
  }

  const step1Done = state !== "preview";
  const step2Done = state === "verifying" || state === "active";
  const step3Done = state === "active";

  return (
    <div className="space-y-3">
      {/* Step 1 */}
      <Step
        num={1}
        title="Iniciar conexão"
        description="A gente cria uma zona protegida pro seu domínio na nossa infraestrutura. Leva 5 segundos."
        done={step1Done}
        active={state === "preview"}
        icon={Shield}
      >
        {!step1Done ? (
          <button
            type="button"
            onClick={handleStart}
            disabled={pending}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-ddg-lime text-ddg-ink font-bold text-sm border-2 border-ddg-ink shadow-[3px_3px_0_var(--ddg-ink)] hover:shadow-[5px_5px_0_var(--ddg-ink)] hover:-translate-y-0.5 transition-all disabled:opacity-50"
          >
            {pending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Iniciando…
              </>
            ) : (
              <>
                Iniciar conexão pra {domain}
                <Globe className="w-4 h-4" />
              </>
            )}
          </button>
        ) : (
          <p className="text-sm text-ddg-muted">
            Zona criada pra <strong className="text-ddg-ink">{domain}</strong>.
          </p>
        )}
      </Step>

      {/* Step 2 */}
      <Step
        num={2}
        title="Troque os nameservers no seu registrador"
        description="No painel onde você comprou o domínio (Registro.br, GoDaddy, etc), troque os 'nameservers' pelos 2 que mostramos abaixo. Esse é o único passo técnico."
        done={step2Done}
        active={state === "zone_created"}
        icon={Server}
      >
        {state === "preview" ? (
          <p className="text-sm text-ddg-muted italic">
            Finalize o Passo 1 primeiro.
          </p>
        ) : nameservers.length === 2 ? (
          <div className="space-y-3">
            <div className="rounded-lg border-2 border-ddg-ink bg-ddg-cream/50 p-4">
              <div className="ddg-bracket mb-2">USE ESTES 2 NAMESERVERS</div>
              {nameservers.map((ns, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 py-1.5"
                >
                  <code className="font-mono text-sm text-ddg-ink">{ns}</code>
                  <button
                    type="button"
                    onClick={() => copyValue(ns)}
                    aria-label="Copiar"
                    className="shrink-0 p-1.5 rounded-md border-2 border-transparent hover:border-ddg-ink hover:bg-ddg-cream transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5 text-ddg-muted" />
                  </button>
                </div>
              ))}
            </div>

            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-ddg-muted mb-2">
                Tutorial visual no seu registrador:
              </div>
              <div className="flex flex-wrap gap-2">
                {REGISTRARS.map((r) => (
                  <a
                    key={r.name}
                    href={r.tutorial}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-ddg-stone text-xs text-ddg-ink hover:border-ddg-ink transition-colors"
                  >
                    {r.name}
                    <ExternalLink className="w-3 h-3 text-ddg-muted" />
                  </a>
                ))}
              </div>
            </div>

            <p className="text-xs text-ddg-muted leading-relaxed">
              💡 Os nameservers anteriores devem ser <strong>substituídos</strong>,
              não adicionados. Se você usa email no domínio (ex: contato@seusite.com.br),
              fala com a gente antes — a gente migra os registros MX juntos pra
              não derrubar seu email.
            </p>
          </div>
        ) : (
          <p className="text-sm text-amber-700">
            Aguarde os nameservers serem gerados…
          </p>
        )}
      </Step>

      {/* Step 3 */}
      <Step
        num={3}
        title="Verificar e ativar"
        description="Depois que você trocou os nameservers, clica aqui pra a gente checar se o DNS já propagou. Pode levar entre 10 min e 6 horas."
        done={step3Done}
        active={state === "verifying" || (state === "zone_created" && nameservers.length === 2)}
        icon={Check}
      >
        {state === "active" ? (
          <p className="text-sm text-ddg-lime-deep font-bold">
            ✅ Ativado em {domain}/blog
          </p>
        ) : state === "verifying" ? (
          <p className="text-sm text-blue-700">
            <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1.5" />
            Verificando propagação… Pode levar até 6h, vamos avisar por
            e-mail quando finalizar.
          </p>
        ) : state === "zone_created" ? (
          <button
            type="button"
            onClick={handleVerify}
            disabled={pending}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-ddg-lime text-ddg-ink font-bold text-sm border-2 border-ddg-ink shadow-[3px_3px_0_var(--ddg-ink)] hover:shadow-[5px_5px_0_var(--ddg-ink)] hover:-translate-y-0.5 transition-all disabled:opacity-50"
          >
            {pending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Verificando…
              </>
            ) : (
              <>
                Já troquei, verificar agora
                <Check className="w-4 h-4" />
              </>
            )}
          </button>
        ) : (
          <p className="text-sm text-ddg-muted italic">
            Finalize o Passo 2 primeiro.
          </p>
        )}
      </Step>
    </div>
  );
}

function Step({
  num,
  title,
  description,
  done,
  active,
  icon: Icon,
  children,
}: {
  num: number;
  title: string;
  description: string;
  done: boolean;
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border-2 p-5 transition-all ${
        done
          ? "border-ddg-lime/50 bg-ddg-lime/5"
          : active
          ? "border-ddg-ink bg-ddg-paper shadow-[3px_3px_0_var(--ddg-ink)]"
          : "border-ddg-stone bg-ddg-paper opacity-70"
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg border-2 ${
            done
              ? "border-ddg-lime bg-ddg-lime text-ddg-ink"
              : "border-ddg-ink bg-ddg-paper text-ddg-ink"
          }`}
        >
          {done ? <Check className="w-5 h-5" strokeWidth={3} /> : <span className="font-black">{num}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Icon className="w-4 h-4 text-ddg-muted" />
            <h3 className="font-bold text-base text-ddg-ink">{title}</h3>
          </div>
          <p className="text-sm text-ddg-muted leading-relaxed mb-3">
            {description}
          </p>
          {children}
        </div>
      </div>
    </div>
  );
}
