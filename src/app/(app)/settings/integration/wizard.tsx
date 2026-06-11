"use client";

/**
 * Wizard interativo de conexão de domínio (modelo SUBDOMÍNIO + CNAME).
 *
 * Passos:
 *  Step 1 — Iniciar (a gente registra blog.{dominio} na nossa infra)
 *  Step 2 — Adicionar 1 registro CNAME (cliente faz no registrador)
 *  Step 3 — Verificar e ativar
 *
 * State controla qual step está ativo:
 *  preview       → step 1 ativo
 *  cname_pending → step 2 ativo (mostra o CNAME)
 *  verifying     → step 3 (loading)
 *  active        → tudo concluído
 */
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Copy, Globe, Loader2, Plus, Shield } from "lucide-react";
import {
  initiateDomainConnection,
  verifyDomainConnection,
} from "./actions";
import { RegistrarTutorials } from "./registrar-tutorials";

interface Props {
  siteId: string;
  domain: string;
  state: string;
  /** Host do blog: blog.{domain} */
  blogHost: string;
  /** Nome/Host do registro CNAME (ex: "blog") */
  cnameName: string;
  /** Valor/Destino do CNAME (ex: cname.conteudai.com.br) */
  cnameTarget: string;
}

export function IntegrationWizard({
  siteId,
  domain,
  state,
  blogHost,
  cnameName,
  cnameTarget,
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
      toast.success("Pronto! Veja o registro CNAME no Passo 2.");
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
        toast.success("CNAME confirmado! Ativando seu blog…");
      } else {
        toast.info(
          "O CNAME ainda não propagou. Tenta de novo em alguns minutos."
        );
      }
      router.refresh();
    });
  }

  function copyValue(value: string) {
    navigator.clipboard.writeText(value);
    toast.success("Copiado!");
  }

  const blogHostDisplay = blogHost || `${cnameName}.${domain}`;
  const step1Done = state !== "preview";
  const step2Done = state === "verifying" || state === "active";
  const step3Done = state === "active";

  return (
    <div className="space-y-3">
      {/* Step 1 */}
      <Step
        num={1}
        title="Iniciar conexão"
        description="A gente registra o subdomínio do seu blog na nossa infraestrutura e emite o certificado SSL. Leva 5 segundos e não toca no seu site."
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
                Conectar {blogHostDisplay}
                <Globe className="w-4 h-4" />
              </>
            )}
          </button>
        ) : (
          <p className="text-sm text-ddg-muted">
            Subdomínio reservado:{" "}
            <strong className="text-ddg-ink">{blogHostDisplay}</strong>.
          </p>
        )}
      </Step>

      {/* Step 2 */}
      <Step
        num={2}
        title="Adicione 1 registro CNAME no seu registrador"
        description="No painel onde você comprou o domínio (Registro.br, Hostinger, GoDaddy, etc), adicione UM registro CNAME com os valores abaixo. Não troca nameserver, não toca no seu site nem no seu email."
        done={step2Done}
        active={state === "cname_pending"}
        icon={Plus}
      >
        {state === "preview" ? (
          <p className="text-sm text-ddg-muted italic">
            Finalize o Passo 1 primeiro.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border-2 border-ddg-ink bg-ddg-cream/50 p-4">
              <div className="ddg-bracket mb-3">ADICIONE ESTE REGISTRO CNAME</div>
              <div className="space-y-2">
                <CnameRow label="Tipo" value="CNAME" onCopy={copyValue} />
                <CnameRow label="Nome / Host" value={cnameName} onCopy={copyValue} />
                <CnameRow
                  label="Valor / Destino"
                  value={cnameTarget}
                  onCopy={copyValue}
                />
                <CnameRow label="TTL" value="3600 (ou automático)" onCopy={copyValue} />
              </div>
            </div>

            <p className="text-xs text-ddg-muted leading-relaxed">
              ✅ Isso só <strong className="text-ddg-ink">adiciona</strong> um
              endereço novo (<code className="text-ddg-ink">{blogHostDisplay}</code>).
              Seu site principal e seu email continuam funcionando exatamente
              como estão.
            </p>

            {/* Tutoriais passo-a-passo por registrador */}
            <div className="pt-2">
              <RegistrarTutorials
                cnameName={cnameName}
                cnameTarget={cnameTarget}
                domain={domain}
              />
            </div>
          </div>
        )}
      </Step>

      {/* Step 3 */}
      <Step
        num={3}
        title="Verificar e ativar"
        description="Depois que você adicionou o CNAME, clica aqui pra a gente checar se já propagou. Geralmente leva de 5 a 30 minutos."
        done={step3Done}
        active={state === "verifying" || state === "cname_pending"}
        icon={Check}
      >
        {state === "active" ? (
          <p className="text-sm text-ddg-lime-deep font-bold">
            ✅ Ativado em {blogHostDisplay}
          </p>
        ) : state === "verifying" ? (
          <p className="text-sm text-blue-700">
            <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1.5" />
            Verificando o CNAME… Pode levar até 30 min, vamos avisar por
            e-mail quando ativar.
          </p>
        ) : state === "cname_pending" ? (
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
                Já adicionei, verificar agora
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

function CnameRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] font-mono uppercase tracking-widest text-ddg-muted w-28 shrink-0">
        {label}
      </span>
      <code className="font-mono text-sm text-ddg-ink flex-1 truncate">
        {value}
      </code>
      <button
        type="button"
        onClick={() => onCopy(value)}
        aria-label="Copiar"
        className="shrink-0 p-1.5 rounded-md border-2 border-transparent hover:border-ddg-ink hover:bg-ddg-cream transition-colors"
      >
        <Copy className="w-3.5 h-3.5 text-ddg-muted" />
      </button>
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
